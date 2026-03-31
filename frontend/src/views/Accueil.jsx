import { Logout } from "@/components/auth/Logout";
import { ListGroups } from "@/components/group/listGroups";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

export function Accueil(){
    const {user} = useAuth();

    return(
        <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <div className="flex items-center justify-end gap-1 px-4 lg:gap-2 lg:px-6">
                        <h1 className="text-base font-medium">Bonjour {user.name}</h1>
                        <Separator
                        orientation="vertical"
                        className="mx-2"
                        />
                        <Logout/>
                    </div>
                    <ListGroups/>
                </div>
            </div>
        </div>
    );
}