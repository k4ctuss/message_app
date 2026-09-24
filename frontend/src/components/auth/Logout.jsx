import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

export function Logout() {
    const { logout } = useAuth();
    return (
        <Button data-cy="logout" onClick={logout} variant="outline">
            Se deconnecter
        </Button>
    );
}
