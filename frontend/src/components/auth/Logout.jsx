import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";

export function Logout(){
    const {logout} = useAuth();
    return <Button data-cy="logout" onClick={logout} variant="outline" >Se deconnecter</Button>;
}
