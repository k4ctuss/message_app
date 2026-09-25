import { Logout } from "@/components/auth/Logout";
import { ListGroups } from "@/components/group/ListGroups";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { Outlet } from "react-router-dom";

export function Accueil() {
    const { user } = useAuth();

    return (
        <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col mx-auto gap-4 py-4 md:gap-6 md:py-6">
                <div className="self-end flex items-center gap-1 lg:gap-2">
                    <h1 className="text-base font-medium">
                        Bonjour {user.name}
                    </h1>
                    <Separator orientation="vertical" className="mx-2" />
                    <Logout />
                </div>
                <div className="flex gap-4 flex-col md:flex-row">
                    <ListGroups />
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
