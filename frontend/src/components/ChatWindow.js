import { useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";
import SkeletonLoader from "./SkeletonLoader";
import axios from "axios";
import MessageBubble from "./MessageBubble";
import useListenMessages from "../hooks/useListenMessages";
import { useSocketContext } from "../context/SocketContext";
import { useAuthContext } from "../context/AuthContext";

const ChatWindow = ({ selectedFriend }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [replyTo, setReplyTo] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    useListenMessages(setMessages);
    // useListenMessages returns socket? No, it doesn't. We need to check useListenMessages or useSocketContext directly.
    // Actually useListenMessages only listens for newMessage. We need to listen for others too.
    // Let's check useListenMessages implementation or just use socket here.

    // We need to import useSocketContext if useListenMessages doesn't expose it.
    // But wait, useListenMessages is a custom hook. Let's see what it does.
    // Assuming we can just add listeners here.

    const { authUser } = useAuthContext();
    const { socket: socketInstance } = useSocketContext();
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (socketInstance) {
            socketInstance.on("messageDeleted", (messageId) => {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            });

            socketInstance.on("messageUpdated", (updatedMessage) => {
                setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
            });

            socketInstance.on("typing", ({ senderId, groupId }) => {
                if (selectedFriend?.isGroup) {
                    if (groupId === selectedFriend.id && senderId !== authUser.id) {
                        setIsTyping(true);
                    }
                } else {
                    if (selectedFriend && senderId === selectedFriend.id) {
                        setIsTyping(true);
                    }
                }
            });

            socketInstance.on("stopTyping", ({ senderId, groupId }) => {
                if (selectedFriend?.isGroup) {
                    if (groupId === selectedFriend.id && senderId !== authUser.id) {
                        setIsTyping(false);
                    }
                } else {
                    if (selectedFriend && senderId === selectedFriend.id) {
                        setIsTyping(false);
                    }
                }
            });

            socketInstance.on("messageRead", ({ messageId, readAt }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, readAt } : m));
            });


            socketInstance.on("newGroupMessage", (newMessage) => {
                if (selectedFriend?.isGroup && newMessage.groupId === selectedFriend.id) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });

                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                }
            });

            return () => {
                socketInstance.off("messageDeleted");
                socketInstance.off("messageUpdated");
                socketInstance.off("typing");
                socketInstance.off("stopTyping");
                socketInstance.off("messageRead");
                socketInstance.off("newGroupMessage");
            };
        }
    }, [socketInstance, selectedFriend, authUser]);


    useEffect(() => {
        if (selectedFriend && messages.length > 0 && socketInstance && !selectedFriend.isGroup) {
            const unreadMessages = messages.filter(m => m.senderId === selectedFriend.id && !m.readAt);
            unreadMessages.forEach(m => {
                socketInstance.emit("markAsRead", { messageId: m.id, senderId: m.senderId });

                setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, readAt: new Date() } : msg));
            });
        }
    }, [messages, selectedFriend, socketInstance]);


    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedFriend) return;
            setLoading(true);
            setMessages([]);
            setCursor(null);
            setHasMore(true);
            setIsTyping(false); // Reset typing state on chat switch


            if (selectedFriend.isGroup && socketInstance) {
                socketInstance.emit("joinGroup", selectedFriend.id);
            }

            try {
                let url = `/messages/${selectedFriend.id}`;
                if (selectedFriend.isGroup) {
                    url = `/groups/${selectedFriend.id}/messages`;
                }

                const params = {};
                if (isSearching && searchQuery) {
                    params.search = searchQuery;
                }

                console.log("[ChatWindow] Fetching messages with params:", params);
                const res = await axios.get(url, { params });
                console.log("[ChatWindow] Messages received:", res.data.messages.length);

                let fetchedMessages = res.data.messages || [];
                if (isSearching && searchQuery) {
                    fetchedMessages = fetchedMessages.filter(msg => !msg.contentOriginal.startsWith("[Image]"));
                }
                setMessages(fetchedMessages);
                setCursor(res.data.nextCursor);
                setHasMore(!!res.data.nextCursor);
            } catch (error) {
                console.error("[ChatWindow] Error fetching messages:", error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchMessages();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [selectedFriend, searchQuery, isSearching, socketInstance]);

    useEffect(() => {

        if (!loading) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages.length, loading, isTyping]);

    const handleScroll = async (e) => {
        const { scrollTop } = e.target;
        if (scrollTop === 0 && hasMore && !loadingMore && !loading) {
            setLoadingMore(true);
            const currentScrollHeight = e.target.scrollHeight;

            try {
                let url = `/messages/${selectedFriend.id}`;
                if (selectedFriend.isGroup) {
                    url = `/groups/${selectedFriend.id}/messages`;
                }

                const params = { cursor };
                if (isSearching && searchQuery) {
                    params.search = searchQuery;
                }

                const res = await axios.get(url, { params });


                setMessages(prev => [...res.data.messages, ...prev]);
                setCursor(res.data.nextCursor);
                setHasMore(!!res.data.nextCursor);


                setTimeout(() => {
                    const newScrollHeight = e.target.scrollHeight;
                    e.target.scrollTop = newScrollHeight - currentScrollHeight;
                }, 0);

            } catch (error) {
                console.error(error);
            } finally {
                setLoadingMore(false);
            }
        }
    };

    const handleTyping = () => {
        if (!socketInstance) return;
        const payload = selectedFriend.isGroup
            ? { groupId: selectedFriend.id }
            : { receiverId: selectedFriend.id };

        socketInstance.emit("typing", payload);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            socketInstance.emit("stopTyping", payload);
        }, 2000);
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim()) return;


        const payload = selectedFriend.isGroup
            ? { groupId: selectedFriend.id }
            : { receiverId: selectedFriend.id };
        if (socketInstance) socketInstance.emit("stopTyping", payload);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        try {
            const body = { message: newMessage };
            if (selectedFriend.isGroup) {
                body.groupId = selectedFriend.id;
            } else {
                body.receiverId = selectedFriend.id;
            }
            if (replyTo) {
                body.replyToId = replyTo.id;
            }

            const res = await axios.post("/messages/send", body);




            setNewMessage("");
            setReplyTo(null);
            setShowEmojiPicker(false);


            if (!selectedFriend.isGroup) {
                setMessages(prev => {
                    if (prev.some(m => m.id === res.data.id)) return prev;
                    return [...prev, res.data];
                });
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleEmojiClick = (emojiObject) => {
        setNewMessage(prev => prev + emojiObject.emoji);
    };

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result.split(",")[1];
                    try {
                        const res = await axios.post("/messages/send", {
                            receiverId: selectedFriend.id,
                            type: "audio",
                            audioData: base64Audio
                        });
                        if (!selectedFriend.isGroup) {
                            setMessages(prev => {
                                if (prev.some(m => m.id === res.data.id)) return prev;
                                return [...prev, res.data];
                            });
                            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                        }
                    } catch (error) {
                        console.error("Failed to send voice note", error);
                        alert("Failed to send voice note");
                    }
                };

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleMicClick = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            handleSendMessage(e);
        } else {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const res = await axios.post("/messages/send", {
                    message: `[Image] ${reader.result}`,
                    receiverId: selectedFriend.id
                });
                if (!selectedFriend.isGroup) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === res.data.id)) return prev;
                        return [...prev, res.data];
                    });
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                }
            } catch (error) {
                console.error(error);
                alert("File too large or upload failed");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [newMemberUsername, setNewMemberUsername] = useState("");

    const handleAddMember = async () => {
        if (!newMemberUsername.trim()) return;
        try {

            const userRes = await axios.get(`/users?search=${newMemberUsername}`);
            const userToAdd = userRes.data.find(u => u.username === newMemberUsername);

            if (!userToAdd) {
                alert("User not found");
                return;
            }

            await axios.post(`/groups/${selectedFriend.id}/add`, { userId: userToAdd.id });
            alert("Member added");
            setNewMemberUsername("");

        } catch (error) {
            console.error("Failed to add member", error);
            alert(error.response?.data?.error || "Failed to add member");
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await axios.post(`/groups/${selectedFriend.id}/remove`, { userId });
            alert("Member removed");
        } catch (error) {
            console.error("Failed to remove member", error);
            alert(error.response?.data?.error || "Failed to remove member");
        }
    };

    if (!selectedFriend) {
        return (
            <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--brand-gradient)",
                flexDirection: "column"
            }}>
                <div style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    padding: "40px",
                    borderRadius: "20px",
                    textAlign: "center",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                    maxWidth: "80%"
                }}>
                    <h2 style={{
                        fontSize: "2rem",
                        marginBottom: "10px",
                        background: "var(--brand-gradient)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontWeight: "bold"
                    }}>
                        Welcome to LinguaLink 👋
                    </h2>
                    <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>
                        Select a chat to start messaging
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
            {/* Group Info Modal */}
            {showGroupInfo && selectedFriend.isGroup && (
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    zIndex: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <div style={{
                        background: "white",
                        padding: "20px",
                        borderRadius: "10px",
                        width: "400px",
                        maxHeight: "80%",
                        overflowY: "auto",
                        boxShadow: "0 5px 15px rgba(0,0,0,0.3)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ margin: 0 }}>Group Info</h3>
                            <button onClick={() => setShowGroupInfo(false)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
                        </div>

                        <div style={{ marginBottom: "20px", textAlign: "center" }}>
                            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 10px" }}>#</div>
                            <h4 style={{ margin: "0 0 5px" }}>{selectedFriend.name}</h4>
                            <p style={{ margin: 0, color: "gray", fontSize: "0.9rem" }}>{selectedFriend.members?.length} members</p>
                        </div>

                        <div style={{ marginBottom: "20px" }}>
                            <h5 style={{ marginBottom: "10px" }}>Add Member</h5>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <input
                                    type="text"
                                    placeholder="Enter username"
                                    value={newMemberUsername}
                                    onChange={(e) => setNewMemberUsername(e.target.value)}
                                    style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ddd" }}
                                />
                                <button onClick={handleAddMember} style={{ padding: "8px 15px", background: "var(--primary)", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Add</button>
                            </div>
                        </div>

                        <div>
                            <h5 style={{ marginBottom: "10px" }}>Members</h5>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {selectedFriend.members?.map(member => (
                                    <div key={member.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #eee" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#ddd", overflow: "hidden" }}>
                                                {member.user.profilePic ? <img src={member.user.profilePic} alt="" style={{ width: "100%", height: "100%" }} /> : null}
                                            </div>
                                            <span>{member.user.username} {member.userId === selectedFriend.adminId && <span style={{ fontSize: "0.7rem", background: "#eee", padding: "2px 5px", borderRadius: "4px", marginLeft: "5px" }}>Admin</span>}</span>
                                        </div>
                                        {member.userId !== authUser.id && (
                                            <button onClick={() => handleRemoveMember(member.userId)} style={{ color: "red", background: "transparent", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Remove</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{
                padding: "10px 20px",
                background: "var(--header-bg)",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: "60px"
            }}>
                {isSearching ? (
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            padding: "8px 15px",
                            borderRadius: "8px",
                            border: "none",
                            outline: "none",
                            width: "100%",
                            marginRight: "10px",
                            background: "var(--sidebar-bg)",
                            color: "var(--text-primary)"
                        }}
                    />
                ) : (
                    <div
                        style={{ display: "flex", alignItems: "center", gap: "15px", cursor: selectedFriend.isGroup ? "pointer" : "default" }}
                        onClick={() => selectedFriend.isGroup && setShowGroupInfo(true)}
                    >
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: selectedFriend.isGroup ? "var(--primary)" : "#ccc", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                            {selectedFriend.isGroup ? (
                                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>#</span>
                            ) : (
                                selectedFriend.profilePic ? (
                                    <img src={selectedFriend.profilePic} alt={selectedFriend.username || selectedFriend.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.2rem", background: "var(--primary)" }}>
                                        {(selectedFriend.username || selectedFriend.name || "?")[0].toUpperCase()}
                                    </div>
                                )
                            )}
                        </div>
                        <div>
                            <div style={{ fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "5px" }}>
                                {selectedFriend.username || selectedFriend.name}
                                {selectedFriend.isGroup && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "normal" }}>ⓘ</span>}
                            </div>
                            {isTyping ? <div style={{ fontSize: "0.8rem", color: "var(--primary)", fontStyle: "italic" }}>typing...</div> : (
                                selectedFriend.isGroup && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{selectedFriend.members?.length} members</div>
                            )}
                        </div>
                    </div>
                )}
                <button
                    onClick={() => {
                        setIsSearching(!isSearching);
                        if (isSearching) setSearchQuery(""); // Clear search when closing
                    }}
                    style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "1.2rem"
                    }}
                    title="Search in Chat"
                >
                    {isSearching ? "❌" : "🔍"}
                </button>
            </div>

            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "20px",
                    background: "var(--chat-bg)",
                    backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                    backgroundBlendMode: "soft-light",
                    backgroundSize: "400px"
                }}
            >
                {loadingMore && <p style={{ textAlign: "center", color: "#aaa", fontSize: "0.8rem" }}>Loading more...</p>}

                {loading && messages.length === 0 ? (
                    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <SkeletonLoader type="chat-bubble-left" />
                        <SkeletonLoader type="chat-bubble-right" />
                        <SkeletonLoader type="chat-bubble-left" />
                        <SkeletonLoader type="chat-bubble-right" />
                        <SkeletonLoader type="chat-bubble-left" />
                    </div>
                ) : messages.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#aaa" }}>No messages yet. Start a conversation!</p>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={{
                                ...msg,
                                onDelete: async (id) => {
                                    try {
                                        await axios.delete(`/messages/${id}`);
                                    } catch (error) {
                                        console.error("Failed to delete message", error);
                                        alert("Failed to delete message");
                                    }
                                },
                                onEdit: async (id, newContent) => {
                                    try {
                                        await axios.put(`/messages/${id}`, { message: newContent });
                                    } catch (error) {
                                        console.error("Failed to edit message", error);
                                        throw error;
                                    }
                                },
                                onReply: (msg) => setReplyTo(msg)
                            }}
                            isGroup={selectedFriend.isGroup}
                        />
                    ))
                )}
                {isTyping && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "10px", marginLeft: "10px" }}>
                        <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#ccc", overflow: "hidden" }}>
                            {selectedFriend.profilePic ? (
                                <img src={selectedFriend.profilePic} alt={selectedFriend.username || selectedFriend.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.8rem", background: "var(--primary)" }}>
                                    {(selectedFriend.username || selectedFriend.name || "?")[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div style={{ background: "white", padding: "10px 15px", borderRadius: "0 15px 15px 15px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                            <span className="typing-dots">...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ position: "relative", padding: "10px 20px", background: "var(--header-bg)" }}>
                {showEmojiPicker && (
                    <div style={{ position: "absolute", bottom: "80px", left: "20px", zIndex: 10 }}>
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                )}
                {replyTo && (
                    <div style={{
                        background: "rgba(0,0,0,0.05)",
                        padding: "5px 10px",
                        borderLeft: "4px solid var(--primary)",
                        marginBottom: "5px",
                        borderRadius: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            <span style={{ fontWeight: "bold", color: "var(--primary)" }}>
                                {replyTo.senderId === authUser.id ? "You" : (replyTo.sender?.username || "Someone")}
                            </span>
                            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "300px" }}>
                                {replyTo.contentOriginal}
                            </div>
                        </div>
                        <button onClick={() => setReplyTo(null)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
                    </div>
                )}
                <form onSubmit={(e) => e.preventDefault()} style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    background: "white",
                    padding: "5px 10px",
                    borderRadius: "25px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}>
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="hover-scale transition-all"
                        style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", padding: "5px" }}
                    >
                        😊
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="hover-scale transition-all"
                        style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", transform: "rotate(45deg)", padding: "5px" }}
                    >
                        📎
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileUpload}
                    />
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                        }}
                        onKeyDown={handleKeyDown}
                        style={{
                            flex: 1,
                            padding: "10px",
                            border: "none",
                            outline: "none",
                            fontSize: "1rem",
                            background: "transparent"
                        }}
                    />
                    <button type="button" onClick={handleMicClick} className="hover-scale transition-all" style={{
                        background: isRecording ? "red" : "var(--primary)",
                        border: "none",
                        borderRadius: "50%",
                        width: "40px",
                        height: "40px",
                        color: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                    }}>
                        {isRecording ? "🟥" : (newMessage.trim() ? "➤" : "🎤")}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
