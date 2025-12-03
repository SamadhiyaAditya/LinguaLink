import { useEffect } from "react";
import { useSocketContext } from "../context/SocketContext";
import { useAuthContext } from "../context/AuthContext";

const useListenMessages = (setMessages) => {
    const { socket } = useSocketContext();
    const { authUser } = useAuthContext();

    useEffect(() => {
        socket?.on("newMessage", (newMessage) => {
            setMessages((prev) => {
                if (prev.some(msg => msg.id === newMessage.id)) {
                    return prev;
                }
                return [...prev, newMessage];
            });
        });

        return () => socket?.off("newMessage");
    }, [socket, setMessages]);
};

export default useListenMessages;
