import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./auth-context";
import { SocketContext } from "./socket-context";

export function SocketContextProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const { token } = useAuth();

    useEffect(() => {
        if (!token) return;

        const newSocket = io(import.meta.env.VITE_API_URL, {
            auth: { token },
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
    }, [token]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
}
