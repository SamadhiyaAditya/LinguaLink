"use client";
import { useState, useEffect } from "react";
import ChatSidebar from "../../components/ChatSidebar";
import ChatWindow from "../../components/ChatWindow";
import { useAuthContext } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function ChatPage() {
    const [selectedFriend, setSelectedFriend] = useState(null);
    const { authUser, loading } = useAuthContext();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !authUser) {
            router.push("/");
        }
    }, [authUser, loading, router]);

    if (loading || !authUser) return null;

    return (
        <div style={{
            display: "flex",
            height: "100vh",
            width: "100vw",
        }}>
            <ChatSidebar
                onSelectFriend={setSelectedFriend}
                selectedFriend={selectedFriend}
            />
            <ChatWindow selectedFriend={selectedFriend} />
        </div >
    );
};
