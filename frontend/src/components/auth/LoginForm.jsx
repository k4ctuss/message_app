import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldLabel,
    FieldGroup,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { check_email } from "@/lib/utils";

export function LoginForm({ registerEmail = "" }) {
    const [email, setEmail] = useState(registerEmail);
    const [password, setPassword] = useState("");
    const { login, loading } = useAuth();
    const [formError, setFormError] = useState("");
    const pswdRef = useRef(null);

    // focus on password input if register email is provided
    useEffect(() => {
        if (registerEmail) {
            pswdRef.current?.focus();
        }
    }, [registerEmail]);

    async function handleLogin() {
        const validationError = verifFields();
        if (validationError.length !== 0) {
            setFormError(validationError);
            return;
        }

        const result = await login(email.trim(), password.trim());
        if (!result.success) {
            setFormError(result.message);
            return;
        }

        setFormError("");
    }

    function verifFields() {
        if (!email && !password) return "";

        if (!check_email(email)) {
            return "Mail Invalide !";
        }
        if (password.length < 6) {
            return "Mot de passe trop court !";
        }
        return "";
    }

    return (
        <Card>
            <CardContent>
                <FieldSet>
                    <FieldLegend>Se Connecter</FieldLegend>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="emailLogin">Email</FieldLabel>
                            <Input
                                id="emailLogin"
                                type="email"
                                placeholder="mail@example.fr"
                                value={email}
                                required
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setFormError("");
                                }}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="passwordLogin">
                                Mot de Passe
                            </FieldLabel>
                            <Input
                                ref={pswdRef}
                                id="passwordLogin"
                                type="password"
                                value={password}
                                required
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setFormError("");
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleLogin();
                                }}
                            />
                        </Field>
                        <Button
                            type="button"
                            disabled={!email || !password}
                            onClick={handleLogin}
                        >
                            {loading ? "connection..." : "OK"}
                        </Button>
                    </FieldGroup>
                    <span style={{ color: "red" }}>
                        {verifFields() || formError}
                    </span>
                </FieldSet>
            </CardContent>
        </Card>
    );
}
