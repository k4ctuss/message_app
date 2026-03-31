import { useGroups } from "@/hooks/useGroups";
import { Skeleton } from "@/components/ui/skeleton"


export function GroupsIMemberList(){
    const {groups, error, loading} = useGroups("member");

    return(
        <div className="flex flex-col w-full">
            <h2 className="text-base">Ceux dont je suis membre</h2>
            <ul className="ml-6 list-disc [&>li]:mt-2">
                {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-4 mt-1"/>
                    ))
                )
                :
                (groups.map((group, index)=>{
                    return(
                        <li key={index}> {group.name}</li>
                    );
                }))}
            </ul>
            {error && <p className="text-red-500">Erreur: {error}</p>}
        </div>
    );

}