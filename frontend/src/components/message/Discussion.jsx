import { useNavigate, useParams } from "react-router-dom";
import { Fragment, useEffect, useRef, useState } from "react";
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
    CardAction
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Spinner } from "@/components/ui/spinner";
import { useDiscussion } from "@/hooks/useDiscussion";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { SendHorizontal } from "lucide-react";

export function Discussion(){
    const {user} = useAuth();
    const {socket} = useSocket();
    const navigate = useNavigate();
    const params = useParams();
    const {messages, isLoading, error, sendMessage, isRefetching} = useDiscussion(params.gid);
    const [newMessage, setNewMessage] = useState("");
    const scrollRef = useRef(null);

    function leaveGroup(){
        if(socket){
            socket.emit('deleteMember', {gid:params.gid, uid: user.id}, (res)=>{
                if(res.status == 'NOK') console.log(res.messages);
                else navigate('/');
            });
        }
    }

    function handleAddMessage(){
        if(!newMessage || newMessage.trim() ==="") return;
        sendMessage(newMessage.trim());
        setNewMessage("");
    }

    useEffect(()=>{
        if(scrollRef.current){
            scrollRef.current.scrollIntoView({behavior:"smooth"});
        }
    },[messages]);

    if (error){
        return  <p className="text-red-500">Erreur: {error || "Discussion non trouvé"}</p>
    }
    return(
        <Card className="md:w-sm">
            <CardHeader>
                <CardTitle>Discussion dans le groupe {isLoading?(<Skeleton className="h-4 w-25"/>):(params?.name)}</CardTitle>
                <CardAction><Button variant="destructive" onClick={()=>leaveGroup()} >Leave group</Button></CardAction>
            </CardHeader>
            <CardContent>
                <ScrollArea
                    className="h-[40svh] rounded-md border"
                >
                    {messages.length === 0 && !isLoading && <p className="text-center text-muted-foreground">Aucun message pour le moment</p>}
                    <div className="flex flex-col gap-4 p-4 justify-end min-h-full">
                        {isLoading? (
                            Array.from({ length: 20 }).map((_, i) => (
                                <Fragment key={i}>
                                    <Skeleton key={i} className="w-full h-4 rounded"/>
                                </Fragment>
                            ))
                        ):(
                            messages.map((m,i)=>(
                                <Fragment key={i}>
                                    {m.user.id == user.id ? (
                                        <div key={m.id} className="flex items-end justify-end" ref={i === messages.length-1?scrollRef:null}>
                                            <span className="border rounded-2xl py-2 px-4 bg-primary text-primary-foreground max-w-[70%]">{m.content}</span>
                                        </div>
                                    ) : (
                                        <div key={m.id} className="flex items-end justify-between" ref={i === messages.length-1?scrollRef:null}>
                                            <span className="border rounded-2xl py-2 px-4 max-w-[70%]">{m.content}</span>
                                            <span className="text-sm text-muted-foreground max-w-[30%]">{m.user.name}</span>
                                        </div>
                                    )}
                                </Fragment>
                            )) 
                        )}
                    </div>
                </ScrollArea>
                <Field
                className="mt-4"
                orientation="horizontal"
                >
                    <Input type="text" 
                        value={newMessage} 
                        onChange={e=>setNewMessage(e.target.value)}
                        onKeyDown={e=>{if(e.key === "Enter") handleAddMessage()}}
                        placeholder="Nouveau message"
                    />
                    <Button 
                        disabled={!newMessage || isRefetching || isLoading} 
                        onClick={()=>{handleAddMessage()}}
                        className="rounded-full p-2"
                    >{isRefetching?(<Spinner/>):(<SendHorizontal />)}
                    </Button>
                </Field>
            </CardContent>
        </Card>
    );
}