import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function CreateGroup({ createGroup }) {
    const [newGroupName, setNewGroupName] = useState("");

    return (
        <div className="flex flex-col mt-3 gap-2">
            <Input
                type="text"
                data-cy="new-group-name"
                placeholder="nom du nouveau groupe"
                className="w-full"
                value={newGroupName}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && newGroupName)
                        createGroup(newGroupName);
                }}
                onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Button
                data-cy="create-group"
                onClick={() => createGroup(newGroupName)}
                className="w-25"
                disabled={!newGroupName}
            >
                Créer
            </Button>
        </div>
    );
}
