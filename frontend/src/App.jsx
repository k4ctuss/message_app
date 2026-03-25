import './App.css'
import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL;

function Login(){
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(){

    if(!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(email)){
      setError("Mail Invalide !");
      return;
    }
    if (password.length<6) {
      setError("Mot de passe trop court !");
      return;
    }
    const params = {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({email: email, password: password})
    };

    fetch(`${API_URL}/login`, params)
      .then(res=>res.json())
      .then(res=>setToken(res.token))
      .catch(e=>console.error(e));
  }

  return(
      <fieldset>
        <legend>Se Connecter</legend>
          <label htmlFor="email">Email 
            <input id="email" type="email" value={email} onChange={(e)=>{setError("");setEmail(e.target.value)}}/>
          </label>
          <label htmlFor="password">Mot de Passe
            <input id="password" type="password" value={password} onChange={(e)=>{setError("");setPassword(e.target.value)}}/>
          </label>
        <button type="button" disabled={!email || !password || !!error} onClick={handleLogin}>OK</button>
        {error && <span style={{color:"red"}}>{error}</span>}
        {token !== ""? <span>token obtenu : {token}</span>:<></>}
      </fieldset>
  )
}

function App() {

  return (
    <Login/>
  )
}

export default App
