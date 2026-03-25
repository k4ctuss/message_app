import { useAuth } from "../context/AuthContext";

export function Accueil(){
    const {user} = useAuth();

    return(
        <h1>Bonjour {user.name}</h1>
    )
}