import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export function useDiscussion(gid){
    const {token} = useAuth();

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
                method:'get',
                headers:{'x-access-token':token}
            };
            const response = await fetch(`${API_URL}/api/messages/${gid}`, options);
            if(response.ok){
                const data = await response.json();
                setMessages(data.messages);
            }else{
                const err = await response.json();
                setMessages(err.message);
            }
        }catch(err){
            console.error(err);
            setError(err.messages || "Error lors du chargement de la discussion");
        }finally{
            setIsLoading(false);
        }

    },[gid, token]);

    useEffect(()=>{
        fetchMessages();
    },[fetchMessages]);

    return {
        isLoading,
        isRefetching,
        error,
        messages
    }

}