import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export function useDiscussion(gid){
    const {token} = useAuth();
    const {socket} = useSocket();

    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [error, setError] = useState(null);
    let firstFetch = true;

    const fetchMessages = useCallback(async()=>{

        if(!gid || !Number.isInteger(Number(gid))){
            setError("groupe invalid");
            setMessages([])
            return;
        }

        try{
            setError(null);
            if(firstFetch){
                firstFetch = false;
                setIsLoading(true);
            }

            const options = {
                method:'GET',
                headers:{'x-access-token':token}
            };
            const response = await fetch(`${API_URL}/api/messages/${gid}`, options);
            if(response.ok){
                const data = await response.json();
                setMessages(data.messages);
            }else{
                const err = await response.json();
                setError(err.message);
            }
        }catch(err){
            console.error(err);
            setError(err.message || "Error lors du chargement de la discussion");
        }finally{
            setIsLoading(false);
        }

    },[gid, token]);

    const addMessage = useCallback(async(content)=>{
        if(!gid || !Number.isInteger(Number(gid))){
            setError("groupe invalid");
            setMessages([])
            return;
        }

        try{
            setError(null);
            setIsRefetching(true);

            const options = {
                method:'POST',
                headers:{'x-access-token':token, 'content-type':'application/json'},
                body: JSON.stringify({content:content})
            };
            const response = await fetch(`${API_URL}/api/messages/${gid}`, options);
            if(response.ok){
                await fetchMessages();
            }else{
                const err = await response.json();
                setError(err.message);
            }
        }catch(err){
            console.error(err);
            setError(err.messages || "Error lors du chargement de la discussion");
        }finally{
            setIsRefetching(false);
        }

    },[gid, token]);

    const sendMessage = useCallback((content)=>{

        if(!gid || !Number.isInteger(Number(gid))){
            setError("groupe invalid ou serveur inaccessible");
            return;
        }
        if(!socket){
            addMessage(content);
            return;
        }
        socket.emit('newMessage', {gid, content}, (res)=>{
            if(res.status === "NOK")
                setError(res.message);
            else {
                setError(null);
                fetchMessages();
            }
        });

    },[socket, gid, addMessage, fetchMessages]);

    function handlerReceiveMessage(message){
        console.log("received", message);
        setMessages(prev=>[...prev, message]);
    }

    useEffect(()=>{
        fetchMessages(); // premier chargement
        console.log(socket);
        if(socket){
            socket.emit('joinDiscussion', gid);

            socket.on('receivedMessage', handlerReceiveMessage);


            // clean up
            return () => {
                socket.off('receivedMessage', handlerReceiveMessage);
                socket.emit('leaveDiscussion', gid);
            }
        }

        
    },[fetchMessages, socket]);

    return {
        isLoading,
        isRefetching,
        error,
        messages,
        addMessage,
        sendMessage
    }

}