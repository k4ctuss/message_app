import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./auth-context";
import { SocketContext } from "./socket-context";
import { API_URL } from "@/config/api";

export function SocketContextProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const newSocket = io(API_URL, {
            withCredentials: true,
        });
        newSocket.connect();

        const onConnect = () => console.log("Socket connected:", newSocket.id);
        const onIn = (eventName, ...args) =>
            console.log("[IN]", eventName, ...args);
        const onOut = (eventName, ...args) =>
            console.log("[OUT]", eventName, ...args);

        newSocket.on("connect", onConnect);
        newSocket.onAny(onIn);
        newSocket.onAnyOutgoing(onOut);

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
}
