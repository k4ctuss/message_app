import { Card, CardContent } from "@/components/ui/card";
import { FieldLegend, FieldSet, Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function SignUpForm({registerCallback}){
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [passwords, setPasswords] = useState(Array(2).fill(""));
    const [formError, setFormError] = useState("");
    const {signUp, loading} = useAuth();
    const liveValidationError = verifFields();

    function resetForm(){
        setName("");
        setEmail("");
        setPasswords(["", ""]);
    }
    
    async function handleSignUp(){
        if(liveValidationError.length !== 0){
            return;
        }

        const registeredEmail = email;
        const result = await signUp(name, registeredEmail.trim(), passwords[0].trim());
        if(!result.success){
            setFormError(result.message);
            return;
        }

        setFormError("");
        registerCallback(registeredEmail);
        resetForm();
    }

    function verifFields(){
        if(!name && !email && !passwords[0])
            return "";

        if(!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(email)){
            return "Mail Invalide !";
        }
        if (passwords[0].trim().length<6) {
            return "Mot de passe trop court !";
        }
        if(passwords[0] != passwords[1]){
            return "Mots de passe différents !"
        }
        return "";
    }

    function handlePasswordChange(value, index){
        setPasswords((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
        setFormError("");
    }


    return (
        <Card>
            <CardContent>
                <FieldSet>
                    <FieldLegend>Pas encore de compte Enregistrez vous</FieldLegend>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="name">Nom</FieldLabel>
                            <Input id="name" type="text" placeholder="votre nom" value={name} required onChange={(e)=>{setName(e.target.value); setFormError("");}}/>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="emailSignUp">Email</FieldLabel>
                            <Input id="emailSignUp" type="email" placeholder="mail@example.fr" value={email} required onChange={(e)=>{setEmail(e.target.value); setFormError("");}}/>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="passwordSignUp">Mot de passe</FieldLabel>
                            <Input id="passwordSignUp" type="password" value={passwords[0]} required onChange={(e)=>{handlePasswordChange(e.target.value, 0)}}/>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="passwordVerif">Confimer votre Mot de passe</FieldLabel>
                            <Input id="passwordVerif" type="password" value={passwords[1]} required onChange={(e)=>{handlePasswordChange(e.target.value, 1)}}/>
                        </Field>
                        <Button type="button" disabled={!name || !email || !passwords[0] || !passwords[1] || !!liveValidationError} onClick={handleSignUp}>{loading?"Inscription...":"OK"}</Button>
                    </FieldGroup>
                    <span style={{color:'red'}}>{liveValidationError || formError}</span>
                </FieldSet>
            </CardContent>
        </Card>
    );
}