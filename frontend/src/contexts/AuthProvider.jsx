import { useCallback, useMemo, useReducer, useEffect } from "react";
import { AuthContext } from "@/contexts/auth-context";
import { API_URL } from "@/config/api";

const initialState = {
    user: null,
    loading: false,
};

function authReducer(state, action) {
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, loading: true };
        case "LOGIN_SUCCESS":
            return {
                ...state,
                user: action.payload.user,
                loading: false,
            };
        case "SIGNUP_SUCCESS":
            return { ...state, loading: false };
        case "REQUEST_FAILED":
            return { ...state, loading: false };
        case "LOGOUT":
            return { ...state, user: null, loading: false };
        default:
            return state;
    }
}

export function AuthContextProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const checkAuth = useCallback(async () => {
        dispatch({ type: "SET_LOADING" });
        try {
            const response = await fetch(`${API_URL}/api/me`, {
                credentials: "include",
            });

            if (!response.ok) {
                dispatch({ type: "LOGOUT" });
                return;
            }

            const body = await response.json();
            if (body.user) {
                dispatch({
                    type: "LOGIN_SUCCESS",
                    payload: { user: body.user },
                });
                return;
            } else {
                dispatch({ type: "LOGOUT" });
                return;
            }
        } catch (e) {
            console.error(e);
            dispatch({ type: "LOGOUT" });
        }
    }, []);

    const login = useCallback(
        async (email, password) => {
            dispatch({ type: "SET_LOADING" });
            const params = {
                method: "POST",
                credentials: "include",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email: email, password: password }),
            };
            try {
                const response = await fetch(`${API_URL}/login`, params);
                const body = await response.json();
                if (response.ok) {
                    await checkAuth();
                    return { success: true, message: "" };
                } else {
                    dispatch({ type: "REQUEST_FAILED" });
                    return {
                        success: false,
                        message: body.message || "Erreur inconnue",
                    };
                }
            } catch (e) {
                console.error(e);
                dispatch({ type: "REQUEST_FAILED" });
                return {
                    success: false,
                    message: "Erreur de connexion au serveur",
                };
            }
        },
        [checkAuth],
    );

    const signUp = useCallback(async (name, email, password) => {
        dispatch({ type: "SET_LOADING" });
        const params = {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
            }),
        };
        try {
            const response = await fetch(`${API_URL}/register`, params);
            const body = await response.json();
            if (response.ok) {
                dispatch({ type: "SIGNUP_SUCCESS" });
                return { success: true, message: "" };
            } else {
                dispatch({ type: "REQUEST_FAILED" });
                return {
                    success: false,
                    message: body.message || "Erreur inconnue",
                };
            }
        } catch (e) {
            console.error(e);
            dispatch({ type: "REQUEST_FAILED" });
            return {
                success: false,
                message: "Erreur de connexion au serveur",
            };
        }
    }, []);

    const isConnected = useCallback(() => {
        return state.user !== null;
    }, [state.user]);

    const logout = useCallback(async () => {
        await fetch(`${API_URL}/logout`, {
            method: "POST",
            credentials: "include",
        });

        if (window.location.hash !== "") {
            window.location.replace(
                window.location.pathname + window.location.search,
            );
        }
        dispatch({ type: "LOGOUT" });
    }, []);

    // useEffect for checkAuth on mount
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const value = useMemo(
        () => ({
            ...state,
            login,
            signUp,
            isConnected,
            checkAuth,
            logout,
        }),
        [state, login, isConnected, signUp, checkAuth, logout],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
