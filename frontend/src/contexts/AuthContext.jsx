import { createContext, useCallback, useContext, useMemo, useReducer } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const initialState = {
    token: "",
    user: null,
    loading:false
}

function authReducer(state, action){
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, loading: true };
        case "LOGIN_SUCCESS":
            return { ...state, token: action.payload.token, user: action.payload.user, loading: false};
        case "SIGNUP_SUCCESS":
            return { ...state, loading: false };
        case "REQUEST_FAILED":
            return { ...state, loading: false };
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
                return { success: true, message: "" };
            }else{
                dispatch({type: "REQUEST_FAILED"});
                return { success: false, message: body.message || "Erreur inconnue" };
            }
        }catch(e){
            console.error(e);
            dispatch({type: "REQUEST_FAILED"});
            return { success: false, message: "Erreur de connexion au serveur" };
        }
    }, []);

    const signUp = useCallback(async(name, email, password)=>{
        dispatch({type: "SET_LOADING"});
        const params = {
            method: 'POST',
            headers: {'content-type':'application/json'},
            body: JSON.stringify({name: name, email: email, password: password})
        };
        try{
            const response = await fetch(`${API_URL}/register`, params);
            const body = await response.json();
            if(response.ok){
                dispatch({type: "SIGNUP_SUCCESS"});
                return { success: true, message: "" };
            }else{
                dispatch({type: "REQUEST_FAILED"});
                return { success: false, message: body.message || "Erreur inconnue" };
            }
        }catch(e){
            console.error(e);
            dispatch({type: "REQUEST_FAILED"});
            return { success: false, message: "Erreur de connexion au serveur" };
        }
    },[])

    const isConnected = useCallback(()=>{
        return state.token && state.token !== "";
    }, [state.token]);

    const value = useMemo(()=>({
        ...state,
        login,
        signUp,
        isConnected
    }), [state, login, isConnected, signUp]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){
    return useContext(AuthContext);
}