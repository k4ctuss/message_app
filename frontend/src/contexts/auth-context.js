import { createContext, useContext } from "react";

export const AuthContext = createContext(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth doit être utilisé dans un AuthProvider");
    }
    return context;
}
