import {useParams} from "react-router-dom";
import { useState } from "react";

import { useManageGroup } from "@/hooks/useManageGroup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "../ui/separator";

export function AdminGroup(){
    let params = useParams();
    const gid = params.gid;
    const {group, error, loading, addMember, deleteMember, addMemberWS, deleteMemberWS} = useManageGroup(gid);
    const [addMemberId, setAddMemberId] = useState(null);

    return(
        <Card className="md:min-w-sm">
            {loading ?(
                <>
                    <CardHeader>
                        <CardTitle>Administration <Skeleton className="h-4 w-25"/></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <Skeleton key={index} className="h-6"/>
                            ))}
                        </div>
                    </CardContent>
                </>
            ) : (error || !group) ? (
                <p className="text-red-500">Erreur: {error || "Groupe non trouvé"}</p>
            ) : (
                <>
                    <CardHeader>
                        <CardTitle>Administration "{group.name}"</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center gap-6 p-4">
                            <Field>
                                <FieldLabel>Ajouter un membre</FieldLabel>
                                <div className="flex justify-between items-center">
                                    <Select
                                        value={addMemberId || ""}
                                        onValueChange={id => setAddMemberId(id)}
                                        disabled={group.potentialMembers.length===0}
                                    >
                                        <SelectTrigger data-cy="select-member" className="w-full max-w-48">
                                            <SelectValue placeholder="Selection un user" >
                                                {addMemberId && group.potentialMembers.find(u => String(u.id) === String(addMemberId))?.email}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                            <SelectLabel>Utilisateur</SelectLabel>
                                            {
                                                group.potentialMembers.map((user) => (
                                                    <SelectItem key={user.id} value={String(user.id)}>{user.email}</SelectItem>
                                                ))
                                            }
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        data-cy="add-member"
                                        disabled={!addMemberId || loading}
                                        onClick={()=>{
                                            setAddMemberId(null);
                                            addMemberWS(addMemberId);
                                        }}
                                    >
                                        Ajouter
                                    </Button>
                                </div>
                            </Field>
                            <Separator/>
                            <div className="w-full">
                                <CardDescription className="w-full">Liste des membres</CardDescription>
                                <div className="flex flex-col w-full gap-4">
                                    {group.members.map((member) => (
                                        <div key={member.id} className="flex justify-between items-center">
                                            <span>{member.email}</span>
                                            <Button
                                                data-cy={`remove-member-${member.id}`}
                                                variant="destructive"
                                                disabled={loading}
                                                onClick={()=>{deleteMemberWS(member.id);}}
                                            >
                                                Supprimer
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </>
            )}
        </Card>
    );
}
