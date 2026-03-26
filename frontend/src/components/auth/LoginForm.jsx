import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import { Field, FieldLabel, FieldGroup, FieldLegend, FieldSet, FieldError} from '@/components/ui/field';
import { Card, CardContent } from '@/components/ui/card';



export function LoginForm({registerEmail=""}){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const {login, loading} = useAuth();
  const [formError, setFormError] = useState("");
  const pswdRef = useRef(null);


  async function handleLogin(){
    const validationError = verifFields();
    if(validationError.length !== 0){
      setFormError(validationError);
      return;
    }

    const result = await login(email.trim(), password.trim());
    if(!result.success){
      setFormError(result.message);
      return;
    }

    setFormError("");
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

  // mise a jour de mail si le register email et changer
  useEffect(()=>{
    setEmail(registerEmail);
    pswdRef.current?.focus();
  }, [registerEmail])

  return(
    <Card>
      <CardContent>
        <FieldSet>
          <FieldLegend>Se Connecter</FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input  id="email" type="email" placeholder="mail@example.fr" value={email} required onChange={(e)=>{setEmail(e.target.value); setFormError("");}}/>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mot de Passe</FieldLabel>
              <Input ref={pswdRef} id="password" type="password" value={password} required onChange={(e)=>{setPassword(e.target.value); setFormError("");}}/>
            </Field>
            <Button type="button" disabled={!email || !password} onClick={handleLogin}>{loading?"connection...":"OK"}</Button>
          </FieldGroup>
          <span style={{color:'red'}}>{verifFields() || formError}</span>
        </FieldSet>
      </CardContent>
    </Card>
  )
}
