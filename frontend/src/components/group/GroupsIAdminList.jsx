import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL;


export function GroupsIAdminList(){
    const [groups, setGroups] = useState([]);
    const {token} = useAuth();

    useEffect(()=>{

        const fetchGroupsAdmin = async()=>{
            const response = await fetch(`${API_URL}/api/mygroups`,{headers:{'x-access-token':token}});
            if(response.ok){
                const data = await response.json();
                setGroups(data.groups);
            }
        }
        fetchGroupsAdmin();
    },[]);

    return(
        <div className="flex flex-col w-full">
            <h2 className="text-base">Ceux que j'administre</h2>
            <ul className="ml-6 list-disc [&>li]:mt-2">
                {groups.map((group, index)=>{
                    return(
                        <li key={index}> {group.name}</li>
                    );
                })}
            </ul>
        </div>
    );

}