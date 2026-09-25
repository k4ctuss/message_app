import { useGroups } from "@/hooks/useGroups";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateGroup } from "./CreateGroup";
import { Link } from "react-router-dom";

export function GroupsIAdminList() {
    const { groups, error, loading, createGroup } = useGroups("admin");

    return (
        <div className="flex flex-col w-full">
            <h2 className="text-base">Ceux que j'administre</h2>
            <ul className="ml-6 list-disc [&>li]:mt-2">
                {loading
                    ? Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={index} className="h-4 mt-1" />
                      ))
                    : groups.map((group) => {
                          return (
                              <li key={group.id}>
                                  <Link to={`/groups/${group.id}`}>
                                      {group.name}
                                  </Link>
                              </li>
                          );
                      })}
            </ul>
            {error && <p className="text-red-500">Erreur: {error}</p>}
            <CreateGroup createGroup={createGroup} />
        </div>
    );
}
