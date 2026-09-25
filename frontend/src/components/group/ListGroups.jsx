import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupsIMemberList } from "./GroupsIMemberList";
import { GroupsIAdminList } from "./GroupsIAdminList";
import { Separator } from "@/components/ui/separator";

export function ListGroups() {
    return (
        <Card className="md:min-w-sm">
            <CardHeader>
                <CardTitle>Mes Groupes</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center lg:p-4 gap-6">
                    <GroupsIMemberList />
                    <Separator />
                    <GroupsIAdminList />
                </div>
            </CardContent>
        </Card>
    );
}
