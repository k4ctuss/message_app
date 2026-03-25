import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext';


export function Login(){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const {login, error} = useAuth();


  function handleLogin(){
    if(verifFields().length === 0)
      login(email, password);
  }

  function verifFields(){
    if(!email && !password)
      return "";

    if(!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(email)){
      return "Mail Invalide !";
    }
    if (password.length<6) {
      return "Mot de passe trop court !";
    }
    return "";
  }

  return(
      <fieldset>
        <legend>Se Connecter</legend>
          <label htmlFor="email">Email
            <input id="email" type="email" value={email} onChange={(e)=>{setEmail(e.target.value)}}/>
          </label>
          <label htmlFor="password">Mot de Passe 
            <input id="password" type="password" value={password} onChange={(e)=>{setPassword(e.target.value)}}/>
          </label>
        <button type="button" disabled={!email || !password} onClick={handleLogin}>OK</button>
        <span style={{color:"red"}}> {error || verifFields()}</span>
      </fieldset>
  )
}
