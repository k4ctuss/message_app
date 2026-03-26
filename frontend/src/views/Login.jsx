import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import { Field, FieldLabel, FieldGroup, FieldLegend, FieldSet, FieldError} from '@/components/ui/field';
import { Card, CardContent } from '@/components/ui/card';



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
    <Card>
      <CardContent>
          <FieldSet>
            <FieldLegend>Se Connecter</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" placeholder="mail@example.fr" value={email} required onChange={(e)=>{setEmail(e.target.value)}}/>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Mot de Passe</FieldLabel>
                <Input id="password" type="password" value={password} required onChange={(e)=>{setPassword(e.target.value)}}/>
              </Field>
              <Button  type="button" onClick={handleLogin}>OK</Button>
            </FieldGroup>
            <span style={{color:'red'}}>{verifFields() || error}</span>
          </FieldSet>
      </CardContent>
    </Card>
  )
}
