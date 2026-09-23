import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useState } from "react";

export function Connection(){
    const [registerEmail, setRegisterEmail] = useState("");
    return (
        <div className="flex flex-col gap-16 max-w-sm">
            <LoginForm registerEmail={registerEmail} key={registerEmail}/>
            <SignUpForm registerCallback={setRegisterEmail}/>
        </div>
    )
}