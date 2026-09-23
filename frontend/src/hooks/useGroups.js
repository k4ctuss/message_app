import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "@/contexts/socket-context";
import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;


export function useGroups(type = "member"){
    const {token} = useAuth();
    const {socket} = useSocket();

    const [groups, setGroups] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchGroups = useCallback(async()=>{
        try{
            setError(null);
            setLoading(true);
            const endpoint = `${API_URL}/api/${type==="admin" ? 'mygroups' : 'groupsmember'}`;
            const response = await fetch(endpoint, {headers:{'x-access-token':token}});
            if(response.ok){
                const data = await response.json();
                setGroups(data.groups);
            }else{
                const error = await response.json();
                setError(error.message);
            }
        }catch(err){
            setError(err.message || "Une erreur s'est produite au chargement des groupes");
        }finally{
            setLoading(false);
        }
    },[token, type]);

    const createGroup = useCallback(async(name)=>{
        try{
            setError(null);
            setLoading(true);
            const options = {
                method: 'POST', 
                headers:{'x-access-token':token, 'content-type':'application/json'}, 
                body: JSON.stringify({name:name})
            };
            const response = await fetch(`${API_URL}/api/mygroups`, options);
            if(response.ok){
                fetchGroups()
            }else{
                const error = await response.json();
                setError(error.message);
            }
        }catch(err){
            setError(err.message || "Une erreur s'est produite à la création du groupe");
        }finally{
            setLoading(false);
        }
    },[token, fetchGroups]);

    function addGroup(group){
        setGroups(prev=>[...prev, group]);
    }

    function deleteGroup(group){
        console.log("delete group");
        setGroups(prev=>prev.filter(g=>g.id!== group.id));
    }


    useEffect(()=>{
        fetchGroups();
        if(socket){
            socket.on(`addedToGroup_${type}`, addGroup);
            socket.on(`deleteGroup_${type}`, deleteGroup);
            return ()=>{
                socket.off(`addedToGroup_${type}`, addGroup);
                socket.off(`deleteGroup_${type}`, deleteGroup);
            };
        }
    },[fetchGroups, socket, type]);

    return{
        groups, 
        error,
        loading,
        createGroup,
    };
}