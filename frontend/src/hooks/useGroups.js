import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;


export function useGroups(type = "member"){
    const {token} = useAuth();

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
            console.log(err);
            setError(err.message || "Une erreur s'est produite au chargement des groupes");
        }finally{
            setLoading(false);
        }
    },[]);

    useEffect(()=>{
        fetchGroups();
    },[fetchGroups]);

    return{
        groups, 
        error,
        loading,
        refresh: fetchGroups
    };
}