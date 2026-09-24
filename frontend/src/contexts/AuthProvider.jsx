import { useCallback, useMemo, useReducer, useEffect } from "react";
import { setCookie, getCookie } from "@/lib/utils";
import { AuthContext } from "@/contexts/auth-context";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const AUTH_COOKIE = "ACCESS_TOKEN_AUTH";

const initialState = {
    token: "",
    user: null,
    loading: false,
};

function authReducer(state, action) {
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, loading: true };
        case "LOGIN_SUCCESS":
            setCookie(
                AUTH_COOKIE,
                JSON.stringify({
                    token: action.payload.token,
                    user: action.payload.user,
                }),
                1000 * 60 * 60 * 24 * 7,
            );
            return {
                ...state,
                token: action.payload.token,
                user: action.payload.user,
                loading: false,
            };
        case "SIGNUP_SUCCESS":
            return { ...state, loading: false };
        case "REQUEST_FAILED":
            return { ...state, loading: false };
        case "LOGOUT":
            return { ...state, token: "", user: null };
        default:
            return state;
    }
}

export function AuthContextProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const login = useCallback(async (email, password) => {
        dispatch({ type: "SET_LOADING" });
        const params = {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: email, password: password }),
        };
        try {
            const response = await fetch(`${API_URL}/login`, params);
            const body = await response.json();
            if (response.ok) {
                dispatch({
                    type: "LOGIN_SUCCESS",
                    payload: { token: body.token, user: body.user },
                });
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
        return state.token && state.token !== "";
    }, [state.token]);

    const checkAuth = useCallback(() => {
        const { token, user } = JSON.parse(getCookie(AUTH_COOKIE) || "{}");
        if (!token || !user) return;
        dispatch({
            type: "LOGIN_SUCCESS",
            payload: { token: token, user: user },
        });
    }, []);

    const logout = useCallback(() => {
        setCookie(AUTH_COOKIE, "", -1);
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
