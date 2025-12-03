import { useState, useEffect } from "react";
import axios from "axios";
import { useAuthContext } from "../context/AuthContext";
import { useSocketContext } from "../context/SocketContext";
import { IoSearchOutline, IoPersonAddOutline, IoLogOutOutline, IoEllipsisVertical } from "react-icons/io5";
import SkeletonLoader from "./SkeletonLoader";
import Profile from "./Profile";

const ChatSidebar = ({ onSelectFriend, selectedFriend }) => {
    const [activeTab, setActiveTab] = useState("chats");
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [showMenu, setShowMenu] = useState(null);

    const { authUser, setAuthUser, logout } = useAuthContext();
    const { onlineUsers, socket } = useSocketContext();

    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [showProfile, setShowProfile] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [contactMenuId, setContactMenuId] = useState(null);

    const fetchFriends = async () => {
        try {
            const res = await axios.get("/users");
            const sortedFriends = res.data.sort((a, b) => {
                return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
            });
            setFriends(sortedFriends);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchFriendRequests = async () => {
        try {
            const res = await axios.get("/contacts/requests");
            setFriendRequests(res.data);
        } catch (error) {
            console.error(error);
        }
    };



    useEffect(() => {
        fetchFriends();
        fetchFriendRequests();
    }, []);

    useEffect(() => {
        if (socket) {
            socket.on("newFriendRequest", (newRequest) => {
                setFriendRequests((prev) => [...prev, newRequest]);
                // Optional: Play sound or show notification
            });

            socket.on("friendRequestAccepted", (newFriend) => {
                setFriends((prev) => [...prev, newFriend]);
                // Optional: Play sound or show notification
            });

            socket.on("newMessage", (newMessage) => {
                setFriends((prevFriends) => {
                    return prevFriends.map((friend) => {
                        if (friend.id == newMessage.senderId) {
                            // Only increment if not currently selected
                            if (selectedFriend?.id != newMessage.senderId) {
                                return { ...friend, unreadCount: (friend.unreadCount || 0) + 1, lastMessageAt: new Date() };
                            }
                            return { ...friend, lastMessageAt: new Date() };
                        }
                        return friend;
                    }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
                });
            });

            socket.on("newGroupMessage", (newMessage) => {
                setGroups((prevGroups) => {
                    const updatedGroups = prevGroups.map((group) => {
                        if (group.id == newMessage.groupId) {
                            // Only increment if not currently selected
                            if (selectedFriend?.id != newMessage.groupId) {
                                return { ...group, unreadCount: (group.unreadCount || 0) + 1, lastMessageAt: new Date() };
                            }
                            return { ...group, lastMessageAt: new Date() };
                        }
                        return group;
                    });
                    return updatedGroups.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
                });
            });

            return () => {
                socket.off("newFriendRequest");
                socket.off("friendRequestAccepted");
                socket.off("newMessage");
                socket.off("newGroupMessage");
            };
        }
    }, [socket, selectedFriend]);

    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await axios.get("/users/search", {
                    params: { query: searchQuery }
                });
                console.log("[ChatSidebar] Search results:", res.data);

                setSearchResults(res.data);
            } catch (error) {
                console.error("[ChatSidebar] Search error:", error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSearch = (e) => {
        e.preventDefault();

    };

    const handleAddFriend = async (friendId) => {
        try {
            await axios.post("/contacts/request", { friendId });
            alert("Friend request sent!");
            setSearchQuery("");
            setSearchResults([]);
            // Optionally refresh requests if we want to show sent requests, but currently we only show received
        } catch (error) {
            alert(error.response?.data?.error || "Error sending request");
        }
    };

    const handleAcceptRequest = async (requestId) => {
        try {
            await axios.put("/contacts/respond", { requestId, status: "ACCEPTED" });
            fetchFriendRequests();
            fetchFriends();
        } catch (error) {
            console.error(error);
            alert("Error accepting request");
        }
    };

    const handleRemoveFriend = async (friendId) => {
        if (!window.confirm("Are you sure you want to remove this friend?")) return;
        try {
            await axios.delete(`/contacts/${friendId}`);
            fetchFriends();
            if (selectedFriend?.id === friendId) {
                onSelectFriend(null);
            }
        } catch (error) {
            console.error(error);
            alert("Error removing friend");
        }
    };

    const [groups, setGroups] = useState([]);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);

    const fetchGroups = async () => {
        try {
            const res = await axios.get("/groups");
            // Map updatedAt to lastMessageAt for consistent sorting
            const groupsWithDate = res.data.map(g => ({
                ...g,
                lastMessageAt: g.updatedAt || g.createdAt
            }));
            setGroups(groupsWithDate);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchFriends();
        fetchFriendRequests();
        fetchGroups();
    }, []);

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName || selectedMembers.length === 0) {
            alert("Please enter a group name and select at least one member.");
            return;
        }
        try {
            const res = await axios.post("/groups/create", {
                name: newGroupName,
                members: selectedMembers
            });
            setGroups(prev => [res.data, ...prev]);
            setShowCreateGroup(false);
            setNewGroupName("");
            setSelectedMembers([]);
            alert("Group created!");
        } catch (error) {
            console.error(error);
            alert("Failed to create group");
        }
    };

    const toggleMemberSelection = (friendId) => {
        setSelectedMembers(prev =>
            prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
        );
    };

    return (
        <div style={{
            width: "350px",
            borderRight: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            background: "var(--sidebar-bg)",
        }}>

            <div style={{
                padding: "10px 16px",
                background: "var(--header-bg)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: "60px",
                borderBottom: "1px solid var(--border-color)",
                position: "relative"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={{
                        margin: 0,
                        background: "var(--brand-gradient)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontSize: "1.5rem",
                        fontWeight: "bold"
                    }}>
                        LinguaLink
                    </h2>
                </div>

                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                            style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "1.2rem",
                                color: "var(--text-secondary)",
                                display: "flex",
                                alignItems: "center",
                                position: "relative"
                            }}
                            title="Menu"
                        >
                            <IoEllipsisVertical />
                            {friendRequests.length > 0 && (
                                <div style={{
                                    position: "absolute",
                                    top: "-2px",
                                    right: "-2px",
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: "red",
                                    border: "1px solid var(--header-bg)"
                                }} />
                            )}
                        </button>
                        {headerMenuOpen && (
                            <div style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                background: "white",
                                borderRadius: "8px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                zIndex: 100,
                                minWidth: "160px",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column"
                            }}>

                                <div
                                    onClick={() => { setShowProfile(true); setHeaderMenuOpen(false); }}
                                    style={{ padding: "10px 15px", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-primary)" }}
                                >
                                    Profile
                                </div>
                                <div
                                    onClick={() => { setShowCreateGroup(true); setHeaderMenuOpen(false); }}
                                    style={{ padding: "10px 15px", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-primary)" }}
                                >
                                    Create Group
                                </div>
                                <div
                                    onClick={() => { setShowRequests(true); setHeaderMenuOpen(false); }}
                                    style={{ padding: "10px 15px", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-primary)", display: "flex", justifyContent: "space-between" }}
                                >
                                    Friend Requests
                                    {friendRequests.length > 0 && <span style={{ background: "var(--primary)", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem" }}>{friendRequests.length}</span>}
                                </div>
                                <div
                                    onClick={logout}
                                    style={{ padding: "10px 15px", cursor: "pointer", fontSize: "0.9rem", color: "#FF6B6B" }}
                                >
                                    Logout
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showProfile && <Profile onClose={() => setShowProfile(false)} />}

            {showCreateGroup && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", zIndex: 1000,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }} onClick={() => setShowCreateGroup(false)}>
                    <div style={{
                        background: "white", padding: "20px", borderRadius: "10px",
                        width: "350px", maxWidth: "90%", color: "#333"
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: "0 0 15px 0", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Create Group</h3>
                        <form onSubmit={handleCreateGroup}>
                            <input
                                type="text"
                                placeholder="Group Name"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                style={{ width: "100%", padding: "8px", marginBottom: "15px", borderRadius: "5px", border: "1px solid #ddd", color: "#333", background: "white" }}
                                required
                            />
                            <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "15px", border: "1px solid #eee", padding: "5px" }}>
                                <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "5px" }}>Select Members:</p>
                                {friends.map(friend => (
                                    <div key={friend.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px" }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedMembers.includes(friend.id)}
                                            onChange={() => toggleMemberSelection(friend.id)}
                                        />
                                        <span>{friend.nickname || friend.username}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button type="button" onClick={() => setShowCreateGroup(false)} style={{ padding: "5px 10px", border: "none", background: "#eee", borderRadius: "5px", cursor: "pointer" }}>Cancel</button>
                                <button type="submit" style={{ padding: "5px 10px", border: "none", background: "var(--primary)", color: "white", borderRadius: "5px", cursor: "pointer" }}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ padding: "10px" }}>
                <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", background: "var(--app-bg)", borderRadius: "8px", padding: "0 10px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>🔍</span>
                    <input
                        id="searchInput"
                        type="text"
                        placeholder="Search or start new chat"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "none",
                            background: "transparent",
                            color: "var(--text-primary)",
                            outline: "none",
                            fontSize: "0.9rem"
                        }}
                    />
                </form>

                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        onClick={() => setFilterType("all")}
                        style={{
                            flex: 1,
                            padding: "6px",
                            borderRadius: "20px",
                            border: "none",
                            background: filterType === "all" ? "var(--primary)" : "var(--app-bg)",
                            color: filterType === "all" ? "white" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            transition: "all 0.2s"
                        }}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterType("unread")}
                        style={{
                            flex: 1,
                            padding: "6px",
                            borderRadius: "20px",
                            border: "none",
                            background: filterType === "unread" ? "var(--primary)" : "var(--app-bg)",
                            color: filterType === "unread" ? "white" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            transition: "all 0.2s"
                        }}
                    >
                        Unread
                    </button>
                </div>
            </div>


            {searchQuery ? (
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {loading ? (
                        <div style={{ padding: "20px" }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                                    <SkeletonLoader type="avatar" />
                                    <div style={{ flex: 1 }}>
                                        <SkeletonLoader type="title" style={{ width: "40%", marginBottom: "5px" }} />
                                        <SkeletonLoader type="text" style={{ width: "70%" }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>

                            {friends.filter(f =>
                                f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (f.nickname && f.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
                            ).length > 0 && (
                                    <>
                                        <h4 style={{ color: "var(--primary)", marginBottom: "10px", fontSize: "0.9rem" }}>My Contacts</h4>
                                        {friends.filter(f =>
                                            f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (f.nickname && f.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
                                        ).map(friend => (
                                            <div
                                                key={friend.id}
                                                onClick={() => {
                                                    onSelectFriend(friend);
                                                    setSearchQuery("");
                                                }}
                                                style={{
                                                    padding: "10px",
                                                    background: "rgba(255,255,255,0.5)",
                                                    marginBottom: "5px",
                                                    borderRadius: "10px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "10px"
                                                }}
                                            >
                                                <div style={{
                                                    width: "10px",
                                                    height: "10px",
                                                    borderRadius: "50%",
                                                    background: onlineUsers.includes(friend.id) ? "#2ecc71" : "#95a5a6"
                                                }} />
                                                <div>
                                                    <div style={{ fontWeight: "bold", color: "#333" }}>{friend.nickname}</div>
                                                    <div style={{ fontSize: "0.8rem", color: "#666" }}>@{friend.username}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}


                            {searchResults.length > 0 && (
                                <>
                                    <h4 style={{ color: "#FF9966", marginTop: "20px", marginBottom: "10px", fontSize: "0.9rem" }}>Global Search</h4>
                                    {searchResults.map(user => {

                                        const isFriend = friends.some(f => f.id == user.id);

                                        if (isFriend) {
                                            return (
                                                <div key={user.id} style={{
                                                    padding: "10px",
                                                    background: "rgba(255,255,255,0.3)",
                                                    marginBottom: "5px",
                                                    borderRadius: "10px",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    opacity: 0.7
                                                }}>
                                                    <span style={{ fontWeight: "bold", color: "#666" }}>{user.username}</span>
                                                    <span style={{ fontSize: "0.8rem", color: "#999" }}>Already added</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={user.id} style={{
                                                padding: "10px",
                                                background: "rgba(255,255,255,0.5)",
                                                marginBottom: "5px",
                                                borderRadius: "10px",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center"
                                            }}>
                                                <span style={{ fontWeight: "bold", color: "#333" }}>{user.username}</span>
                                                <button
                                                    onClick={() => handleAddFriend(user.id)}
                                                    style={{
                                                        background: "#FF7F50",
                                                        border: "none",
                                                        borderRadius: "5px",
                                                        padding: "5px 10px",
                                                        color: "white",
                                                        cursor: "pointer",
                                                        fontSize: "0.8rem"
                                                    }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {searchResults.length === 0 && friends.filter(f => f.username.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                <p style={{ textAlign: "center", color: "#666", marginTop: "20px" }}>No results found</p>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {showRequests && (
                        <div style={{ marginBottom: "20px", padding: "0 10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                <h4 style={{ color: "var(--primary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Friend Requests</h4>
                                <button onClick={() => setShowRequests(false)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-secondary)" }}>Hide</button>
                            </div>
                            {friendRequests.length === 0 && <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>No pending requests</p>}
                            {friendRequests.map(req => (
                                <div key={req.id} style={{
                                    padding: "10px",
                                    background: "var(--app-bg)",
                                    marginBottom: "5px",
                                    borderRadius: "8px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{req.user.username}</div>
                                    <button
                                        onClick={() => handleAcceptRequest(req.id)}
                                        style={{
                                            background: "var(--primary)",
                                            border: "none",
                                            borderRadius: "5px",
                                            padding: "5px 12px",
                                            color: "white",
                                            cursor: "pointer",
                                            fontSize: "0.8rem",
                                            fontWeight: "bold"
                                        }}
                                    >
                                        Accept
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}


                    <h4 style={{ color: "var(--primary)", marginBottom: "10px", fontSize: "0.85rem", padding: "0 10px", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "15px" }}>Chats</h4>
                    {[...friends, ...groups.map(g => ({ ...g, isGroup: true }))]
                        .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
                        .filter(item => {
                            if (filterType === "unread") {
                                return (item.unreadCount && item.unreadCount > 0);
                            }
                            return true;
                        })
                        .map(item => {
                            const isGroup = item.isGroup;
                            const isOnline = !isGroup && onlineUsers.includes(item.id);

                            return (
                                <div
                                    key={isGroup ? `group_${item.id}` : `friend_${item.id}`}
                                    onClick={() => {
                                        onSelectFriend(item);

                                        if (isGroup) {
                                            setGroups(prev => prev.map(g => g.id == item.id ? { ...g, unreadCount: 0 } : g));
                                        } else {
                                            setFriends(prev => prev.map(f => f.id == item.id ? { ...f, unreadCount: 0 } : f));
                                        }
                                    }}
                                    className="hover-bg transition-all"
                                    style={{
                                        padding: "10px 15px",
                                        background: selectedFriend?.id === item.id ? "var(--app-bg)" : "transparent",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        borderBottom: "1px solid var(--border-color)",
                                        opacity: !isGroup && item.status === "BLOCKED" ? 0.6 : 1
                                    }}
                                >
                                    <div style={{ position: "relative", marginRight: "15px" }}>
                                        <div style={{
                                            width: "45px",
                                            height: "45px",
                                            borderRadius: "50%",
                                            background: isGroup ? "var(--primary)" : "#ddd",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "1.2rem",
                                            color: "#fff",
                                            overflow: "hidden"
                                        }}>
                                            {isGroup ? (
                                                <span>#</span>
                                            ) : (
                                                item.profilePic ? (
                                                    <img src={item.profilePic} alt={item.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                ) : (
                                                    <span>{item.nickname ? item.nickname[0].toUpperCase() : item.username[0].toUpperCase()}</span>
                                                )
                                            )}
                                        </div>
                                        {isOnline && (
                                            <div style={{
                                                position: "absolute",
                                                bottom: "2px",
                                                right: "2px",
                                                width: "10px",
                                                height: "10px",
                                                borderRadius: "50%",
                                                background: "#2ecc71",
                                                border: "2px solid white"
                                            }} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: item.unreadCount > 0 ? "800" : "500",
                                            color: "var(--text-primary)",
                                            fontSize: "1rem",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "5px"
                                        }}>
                                            {isGroup ? item.name : item.nickname}
                                            {!isGroup && item.status === "BLOCKED" && <span style={{ fontSize: "0.7rem", color: "red", background: "#ffebee", padding: "2px 5px", borderRadius: "4px" }}>Blocked</span>}
                                        </div>
                                        <div style={{
                                            fontSize: "0.85rem",
                                            color: item.unreadCount > 0 ? "var(--text-primary)" : "var(--text-secondary)",
                                            fontWeight: item.unreadCount > 0 ? "600" : "normal"
                                        }}>
                                            {isGroup ? `${item.members?.length || 0} members` : item.nativeLanguage}
                                        </div>
                                    </div>
                                    {item.unreadCount > 0 && (
                                        <div style={{
                                            background: "#ff4757",
                                            color: "white",
                                            borderRadius: "50%",
                                            minWidth: "20px",
                                            height: "20px",
                                            padding: "0 6px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "0.75rem",
                                            fontWeight: "bold",
                                            marginRight: "10px",
                                            boxShadow: "0 2px 5px rgba(255, 71, 87, 0.4)"
                                        }}>
                                            {item.unreadCount}
                                        </div>
                                    )}
                                    {!isGroup && (
                                        <div style={{ position: "relative" }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setContactMenuId(contactMenuId === item.id ? null : item.id);
                                                }}
                                                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1rem", opacity: 0.6, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}
                                            >
                                                <IoEllipsisVertical />
                                            </button>
                                            {contactMenuId === item.id && (
                                                <div style={{
                                                    position: "absolute",
                                                    top: "100%",
                                                    right: 0,
                                                    background: "white",
                                                    borderRadius: "5px",
                                                    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                                                    zIndex: 10,
                                                    minWidth: "120px",
                                                    overflow: "hidden"
                                                }}>
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newNickname = prompt("Enter new nickname:", item.nickname);
                                                            if (newNickname !== null) {
                                                                console.log(`[ChatSidebar] Updating nickname for contact ${item.contactId} to: ${newNickname}`);
                                                                axios.put(`/contacts/${item.contactId}`, { nickname: newNickname })
                                                                    .then(() => {
                                                                        console.log("[ChatSidebar] Nickname updated, fetching friends...");
                                                                        fetchFriends();
                                                                    })
                                                                    .catch(err => {
                                                                        console.error("[ChatSidebar] Update failed:", err);
                                                                        alert("Failed to update nickname");
                                                                    });
                                                            }
                                                            setContactMenuId(null);
                                                        }}
                                                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-primary)", hover: { background: "#f5f5f5" } }}
                                                    >
                                                        Edit Nickname
                                                    </div>
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const isBlocked = item.status === "BLOCKED";
                                                            const action = isBlocked ? "unblock" : "block";
                                                            if (window.confirm(`Are you sure you want to ${action} this user?`)) {
                                                                axios.put(`/contacts/${item.contactId}`, { status: isBlocked ? "ACCEPTED" : "BLOCKED" })
                                                                    .then(() => fetchFriends())
                                                                    .catch(err => alert(err.response?.data?.error || "Failed to update status"));
                                                            }
                                                            setContactMenuId(null);
                                                        }}
                                                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-primary)" }}
                                                    >
                                                        {item.status === "BLOCKED" ? "Unblock" : "Block"}
                                                    </div>
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveFriend(item.contactId);
                                                            setContactMenuId(null);
                                                        }}
                                                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.8rem", color: "red" }}
                                                    >
                                                        Remove Friend
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
};

export default ChatSidebar;
