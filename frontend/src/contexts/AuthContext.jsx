import { createContext, useCallback, useContext, useMemo, useReducer } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const initialState = {
    token: "",
    user: null,
    error: "",
    loading:false
}

function authReducer(state, action){
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, loading: true, error: "" };
        case "LOGIN_SUCCESS":
            return { ...state, token: action.payload.token, user: action.payload.user, loading: false, error: ""};
        case "SET_ERROR":
            return { ...state, error: action.payload.error, loading: false };
        default:
			return state;
    }

}

const AuthContext = createContext(null);

export function AuthContextProvider({children}){
    const [state, dispatch] = useReducer(authReducer, initialState);

    const login = useCallback(async(email, password)=>{
        dispatch({type: "SET_LOADING"});
        const params = {
            method: 'POST',
            headers: {'content-type':'application/json'},
            body: JSON.stringify({email: email, password: password})
        };
        try{
            const response = await fetch(`${API_URL}/login`, params);
            const body = await response.json();
            if(response.ok){
                dispatch({type: "LOGIN_SUCCESS", payload: {token: body.token, user: body.user}});
            }else{
                dispatch({type: "SET_ERROR", payload: {error: body.message || "Erreur inconnue"}})
            }
        }catch(e){
            console.error(e);
            dispatch({type: "SET_ERROR", payload: {error: "Erreur de connexion au serveur"}})
            return;
        }
    }, []);

    const isConnected = useCallback(()=>{
        return state.token !== "";
    }, [state.token]);

    const value = useMemo(()=>({
        ...state,
        login,
        isConnected
    }), [state, login, isConnected]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){
    return useContext(AuthContext);
}