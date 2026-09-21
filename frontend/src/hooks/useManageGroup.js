import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";

const API_URL = import.meta.env.VITE_API_URL;

export function useManageGroup(gid){
    const {token} = useAuth();
    const {socket} = useSocket();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [group, setGroup] = useState(null);

    const fetchGroup = useCallback(async()=>{
        if(!gid || !Number.isInteger(Number(gid))){
            setError("Id group invalid");
            return;
        }

        try{
            setError(null);
            setLoading(true);

            const options = {
                method:'get',
                headers:{'x-access-token':token}
            };
            const response = await fetch(`${API_URL}/api/mygroups`, options);
            if(response.ok){
                const data = await response.json();
                let myGroup = data.groups.find(g=>g.id == gid);

                // get members;
                const responseMem = await fetch(`${API_URL}/api/mygroups/${gid}`, options);
                if(responseMem.ok){
                    const dataMem = await responseMem.json();
                    myGroup.members = dataMem.members;
                    const responseUsers = await fetch(`${API_URL}/api/users`, options);
                    if(responseUsers.ok){
                        const dataUser = await responseUsers.json();
                        const membersId = myGroup.members.map(u=>u.id);
                        myGroup.potentialMembers = dataUser.users.filter(user => !membersId.includes(user.id));
                        setGroup(myGroup);
                    }else{
                        const error = await responseMem.json();
                        setError(error.message);
                    } 
                }else{
                    const error = await responseMem.json();
                    setError(error.message);
                }
            }else{
                const error = await response.json();
                setError(error.message);
            }
        }catch(err){
            console.log(err);
            setError(err.message || "Error de recuperation du groupe");
        }finally{
            setLoading(false);
        }
    },[gid, token]);

    const manageMember = useCallback(async(type, memberId)=>{
        if(type!== "delete" && type!== "add" || !memberId || !Number.isInteger(Number(memberId))){
            return;
        }
        try{
            setError(null);
            setLoading(true);

            const options = {
                method: type === "add" ? 'put' : 'delete',
                headers:{'x-access-token':token}
            };
            const response = await fetch(`${API_URL}/api/mygroups/${gid}/${memberId}`, options);
            if(!response.ok){
                const error = await response.json();
                setError(error.message);
            }else{
                await fetchGroup();
            }
        }catch(err){
            console.log(err);
            setError(err.message || `Error ${type==="add"? "d'ajout": "de suppresion"} d'un membre`);
        }finally{
            setLoading(false);
        }

    },[token, gid, fetchGroup]);

    const addMember = useCallback(async(memberId)=>{
        await manageMember("add", memberId);
    }, [manageMember]);

    const deleteMember = useCallback(async(memberId)=>{
        await manageMember("delete", memberId);
    }, [manageMember]);

    const addMemberWS = useCallback((memberId)=>{
        if(!socket) {
            addMember(memberId);
            return;
        }
        socket.emit('addMember', {gid, uid: memberId}, (res)=>{
            if(res.status == 'NOK')
                setError(res.message);
            else{
                setError(null);
                fetchGroup();
            }
        });

    },[gid, socket, addMember])
    
    const deleteMemberWS = useCallback((memberId)=>{
        if(!socket) {
            deleteMember(memberId);
            return;
        }
        socket.emit('deleteMember', {gid, uid: memberId}, (res)=>{
            if(res.status == 'NOK')
                setError(res.message);
            else{
                setError(null);
                fetchGroup();
            }
        });

    },[gid, socket, deleteMember])


    useEffect(()=>{
        fetchGroup();
    },[fetchGroup])

    return {
        error,
        loading,
        group,
        addMember,
        deleteMember,
        addMemberWS,
        deleteMemberWS
    }

}