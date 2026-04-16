import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";


const SocketContext = createContext();

export function SocketContextProvider({children}){
    const [socket, setSocket] = useState(null);
    const {token} = useAuth();

    useEffect(()=>{
        if(!token) return;
        
        const newSocket = io(import.meta.env.VITE_API_URL, {
            auth: { token }
        });
        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
        });

        setSocket(newSocket);
        return ()=>{
            newSocket.close();
        }
    },[token]);

    return (
        <SocketContext.Provider value={{socket}}>
            {children}
        </SocketContext.Provider>
    )

}

export function useSocket(){
    return useContext(SocketContext);
}