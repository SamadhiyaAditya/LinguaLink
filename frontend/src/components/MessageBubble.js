import { useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { BsThreeDotsVertical } from "react-icons/bs";

const MessageBubble = ({ message, isGroup }) => {
    const { authUser } = useAuthContext();
    const fromMe = message.senderId === authUser.id;

    // If I sent it, I want to see Original by default.
    // If I received it, I want to see Translated (my language) by default.
    // So showOriginal should be true if fromMe.
    const [showOriginal, setShowOriginal] = useState(fromMe);

    const bubbleColor = fromMe ? "var(--msg-sent)" : "var(--msg-received)";

    const getTranslatedContent = () => {
        if (message.translations && message.translations[authUser.nativeLanguage]) {
            return message.translations[authUser.nativeLanguage];
        }
        return message.contentTranslated;
    };

    const translatedContent = getTranslatedContent();
    const hasTranslation = translatedContent && translatedContent !== message.contentOriginal;

    const handleDelete = async () => {
        if (!window.confirm("Delete this message?")) return;
        try {
            // We assume onDelete is passed from parent to update state
            if (message.onDelete) message.onDelete(message.id);
        } catch (error) {
            console.error(error);
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.contentOriginal);

    const handleEdit = async () => {
        if (!editContent.trim() || editContent === message.contentOriginal) {
            setIsEditing(false);
            return;
        }
        try {
            if (message.onEdit) await message.onEdit(message.id, editContent);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert("Failed to edit message");
        }
    };

    const [showMenu, setShowMenu] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Import at the top: import { BsThreeDotsVertical } from "react-icons/bs";
    // But I can't add import here easily without replacing the whole file or using multi_replace.
    // I'll use multi_replace or just replace the whole return block and add import separately?
    // Let's assume I'll add the import in a separate call or use multi_replace.
    // Actually, I can use replace_file_content for the whole file since it's small enough (160 lines).
    // Or just replace the return block and the import.

    // Let's do it in two steps. First add import.

    const [showInfo, setShowInfo] = useState(false);

    // Ticks Component
    const Ticks = () => {
        if (!fromMe) return null;

        const isRead = !!message.readAt;
        const color = isRead ? "#34B7F1" : "#8696a0"; // Blue or Grey

        return (
            <span style={{ display: "flex", marginLeft: "3px" }} title={isRead ? `Read: ${new Date(message.readAt).toLocaleString()}` : "Sent"}>
                <svg viewBox="0 0 16 15" width="16" height="15" style={{ fill: color }}>
                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                </svg>
            </span>
        );
    };

    const handleTTS = (e) => {
        e.stopPropagation();
        const translatedText = message.translations && message.translations[authUser.nativeLanguage]
            ? message.translations[authUser.nativeLanguage]
            : (message.contentTranslated || message.contentOriginal);

        const textToSpeak = showOriginal ? message.contentOriginal : translatedText;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        // Try to set language if available
        if (showOriginal && message.languageSource) {
            utterance.lang = message.languageSource;
        } else if (!showOriginal) {
            // For groups, we assume the target is the user's native language
            utterance.lang = authUser.nativeLanguage || message.languageTarget;
        }
        window.speechSynthesis.speak(utterance);
    };

    return (
        <>
            {showInfo && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", zIndex: 1000,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }} onClick={() => setShowInfo(false)}>
                    <div style={{
                        background: "white", padding: "20px", borderRadius: "10px",
                        width: "300px", maxWidth: "90%"
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: "0 0 15px 0", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Message Info</h3>
                        <p style={{ fontSize: "0.9rem", color: "#555" }}>
                            <strong>Sent:</strong> {new Date(message.createdAt).toLocaleString()}
                        </p>
                        <p style={{ fontSize: "0.9rem", color: "#555" }}>
                            <strong>Read:</strong> {message.readAt ? new Date(message.readAt).toLocaleString() : "Not read yet"}
                        </p>
                        <div style={{ textAlign: "right", marginTop: "15px" }}>
                            <button onClick={() => setShowInfo(false)} style={{
                                background: "var(--primary)", color: "white", border: "none",
                                padding: "5px 15px", borderRadius: "5px", cursor: "pointer"
                            }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <div
                style={{
                    display: "flex",
                    justifyContent: fromMe ? "flex-end" : "flex-start",
                    marginBottom: "10px",
                    group: "message-bubble"
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
            >
                <div style={{
                    maxWidth: "70%",
                    padding: "8px 12px",
                    borderRadius: "7.5px",
                    background: bubbleColor,
                    color: "var(--text-primary)",
                    position: "relative",
                    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                    display: "flex",
                    flexDirection: "column"
                }}>
                    {isGroup && !fromMe && (
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                            {message.sender?.profilePic ? (
                                <img src={message.sender.profilePic} alt="" style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "white" }}>
                                    {(message.sender?.username?.[0] || "?").toUpperCase()}
                                </div>
                            )}
                            <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--primary)" }}>
                                {message.sender?.username || "Unknown"}
                            </span>
                        </div>
                    )}
                    {message.replyTo && (
                        <div style={{
                            background: "rgba(0,0,0,0.05)",
                            padding: "5px",
                            borderRadius: "4px",
                            borderLeft: "3px solid var(--primary)",
                            marginBottom: "5px",
                            fontSize: "0.8rem",
                            cursor: "pointer"
                        }}>
                            <div style={{ fontWeight: "bold", color: "var(--primary)" }}>
                                {message.replyTo.sender?.username || "Unknown"}
                            </div>
                            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                                {message.replyTo.contentOriginal}
                            </div>
                        </div>
                    )}
                    {isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                autoFocus
                                style={{
                                    padding: "5px",
                                    borderRadius: "5px",
                                    border: "none",
                                    color: "black",
                                    width: "100%"
                                }}
                            />
                            <div style={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                                <button onClick={() => setIsEditing(false)} style={{ fontSize: "0.7rem", cursor: "pointer", background: "rgba(0,0,0,0.2)", border: "none", color: "white", borderRadius: "3px", padding: "2px 5px" }}>Cancel</button>
                                <button onClick={handleEdit} style={{ fontSize: "0.7rem", cursor: "pointer", background: "white", border: "none", color: bubbleColor, borderRadius: "3px", padding: "2px 5px", fontWeight: "bold" }}>Save</button>
                            </div>
                        </div>
                    ) : (
                        message.contentOriginal.startsWith("[Image]") ? (
                            <img
                                src={message.contentOriginal.replace("[Image] ", "")}
                                alt="Shared Image"
                                style={{ maxWidth: "100%", borderRadius: "5px", cursor: "pointer" }}
                                onClick={() => {
                                    const w = window.open("");
                                    w.document.write(`<img src="${message.contentOriginal.replace("[Image] ", "")}" style="max-width: 100%;" />`);
                                }}
                            />
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <p style={{ margin: 0 }}>
                                    {showOriginal
                                        ? message.contentOriginal
                                        : (message.translations && message.translations[authUser.nativeLanguage]
                                            ? message.translations[authUser.nativeLanguage]
                                            : (message.contentTranslated || message.contentOriginal))
                                    }
                                </p>
                            </div>
                        )
                    )}

                    <div style={{
                        fontSize: "0.65rem",
                        marginTop: "2px",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "5px",
                        color: "var(--text-secondary)"
                    }}>
                        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {message.updatedAt && (new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime() > 5000) && (
                                <span style={{ fontStyle: "italic" }}>(edited)</span>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: "5px", alignItems: "center", position: "relative" }}>
                            {fromMe && <Ticks />}

                            {(isHovered || showMenu) && (
                                <div style={{ position: "relative" }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color: "var(--text-secondary)",
                                            cursor: "pointer",
                                            fontSize: "1rem",
                                            padding: "0 5px",
                                            display: "flex",
                                            alignItems: "center",
                                            opacity: 0.6
                                        }}
                                    >
                                        <BsThreeDotsVertical />
                                    </button>
                                    {showMenu && (
                                        <div style={{
                                            position: "absolute",
                                            bottom: "100%",
                                            right: 0,
                                            background: "white",
                                            borderRadius: "5px",
                                            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                                            zIndex: 10,
                                            overflow: "hidden",
                                            display: "flex",
                                            flexDirection: "column",
                                            minWidth: "120px"
                                        }}>
                                            <button
                                                onClick={() => { setShowInfo(true); setShowMenu(false); }}
                                                style={{
                                                    padding: "8px 12px",
                                                    border: "none",
                                                    background: "white",
                                                    color: "#333",
                                                    cursor: "pointer",
                                                    textAlign: "left",
                                                    fontSize: "0.8rem",
                                                    borderBottom: "1px solid #eee"
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
                                                onMouseLeave={(e) => e.target.style.background = "white"}
                                            >
                                                Info
                                            </button>

                                            <button
                                                onClick={() => { message.onReply && message.onReply(message); setShowMenu(false); }}
                                                style={{
                                                    padding: "8px 12px",
                                                    border: "none",
                                                    background: "white",
                                                    color: "#333",
                                                    cursor: "pointer",
                                                    textAlign: "left",
                                                    fontSize: "0.8rem",
                                                    borderBottom: "1px solid #eee"
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
                                                onMouseLeave={(e) => e.target.style.background = "white"}
                                            >
                                                Reply
                                            </button>

                                            {hasTranslation && (
                                                <button
                                                    onClick={() => { setShowOriginal(!showOriginal); setShowMenu(false); }}
                                                    style={{
                                                        padding: "8px 12px",
                                                        border: "none",
                                                        background: "white",
                                                        color: "var(--primary)",
                                                        cursor: "pointer",
                                                        textAlign: "left",
                                                        fontSize: "0.8rem",
                                                        borderBottom: "1px solid #eee",
                                                        fontWeight: "bold"
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
                                                    onMouseLeave={(e) => e.target.style.background = "white"}
                                                >
                                                    {showOriginal ? "See Translation" : "See Original"}
                                                </button>
                                            )}

                                            {/* Only show Edit if less than 10 minutes old and from me */}
                                            {fromMe && (Date.now() - new Date(message.createdAt).getTime() < 10 * 60 * 1000) && (
                                                <button
                                                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                                    style={{
                                                        padding: "8px 12px",
                                                        border: "none",
                                                        background: "white",
                                                        color: "#333",
                                                        cursor: "pointer",
                                                        textAlign: "left",
                                                        fontSize: "0.8rem",
                                                        borderBottom: "1px solid #eee"
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
                                                    onMouseLeave={(e) => e.target.style.background = "white"}
                                                >
                                                    Edit
                                                </button>
                                            )}

                                            {fromMe && (
                                                <button
                                                    onClick={() => { handleDelete(); setShowMenu(false); }}
                                                    style={{
                                                        padding: "8px 12px",
                                                        border: "none",
                                                        background: "white",
                                                        color: "red",
                                                        cursor: "pointer",
                                                        textAlign: "left",
                                                        fontSize: "0.8rem"
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
                                                    onMouseLeave={(e) => e.target.style.background = "white"}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MessageBubble;
