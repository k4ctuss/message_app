import { useParams } from "react-router-dom";
import { Fragment } from "react";
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDiscussion } from "@/hooks/useDiscussion";
import { useAuth } from "@/contexts/AuthContext";

export function Discussion(){
    const {user} = useAuth();
    const params = useParams();
    const {messages, isLoading, error} = useDiscussion(params.gid);

    if (error){
        return  <p className="text-red-500">Erreur: {error || "Discussion non trouvé"}</p>
    }
    return(
        <Card className="md:w-sm">
            <CardHeader>
                <CardTitle>Discussion dans le groupe {isLoading?(<Skeleton className="h-4 w-25"/>):(params?.name)}</CardTitle>
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
                                        <div key={m.id} className="flex items-end justify-end">
                                            <span className="border rounded-2xl py-2 px-4 bg-primary text-primary-foreground max-w-[70%]">{m.content}</span>
                                        </div>
                                    ) : (
                                        <div key={m.id} className="flex items-end justify-between">
                                            <span className="border rounded-2xl py-2 px-4 max-w-[70%]">{m.content}</span>
                                            <span className="text-sm text-muted-foreground max-w-[30%]">{m.user.name}</span>
                                        </div>
                                    )}
                                </Fragment>
                            )) 
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}