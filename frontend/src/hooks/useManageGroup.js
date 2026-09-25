import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "@/contexts/socket-context";

const API_URL = import.meta.env.VITE_API_URL;

async function requestGroup(gid, token) {
    const options = { method: "get", headers: { "x-access-token": token } };

    const resGroups = await fetch(`${API_URL}/api/mygroups`, options);
    const dataGroups = await resGroups.json();
    if (!resGroups.ok) throw new Error(dataGroups.message);

    const myGroup = dataGroups.groups.find((g) => g.id == gid);
    if (!myGroup) throw new Error("Groupe introuvable");

    const resMem = await fetch(`${API_URL}/api/mygroups/${gid}`, options);
    const dataMem = await resMem.json();
    if (!resMem.ok) throw new Error(dataMem.message);
    myGroup.members = dataMem.members;

    const resUsers = await fetch(`${API_URL}/api/users`, options);
    const dataUsers = await resUsers.json();
    if (!resUsers.ok) throw new Error(dataUsers.message);

    const membersId = myGroup.members.map((u) => u.id);
    myGroup.potentialMembers = dataUsers.users.filter(
        (u) => !membersId.includes(u.id),
    );

    return myGroup;
}

export function useManageGroup(gid) {
    const { token } = useAuth();
    const { socket } = useSocket();

    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [group, setGroup] = useState(null);

    const isValidGid = Boolean(gid) && Number.isInteger(Number(gid));
    const error = !isValidGid ? "groupe invalide" : fetchError;

    const fetchGroup = useCallback(async () => {
        if (!isValidGid) return;

        try {
            setGroup(await requestGroup(gid, token));
            setFetchError(null);
        } catch (err) {
            console.log(err);
            setFetchError(err.message || "Error de recuperation du groupe");
        }
    }, [gid, token, isValidGid]);

    const manageMember = useCallback(
        async (type, memberId) => {
            if (
                (type !== "delete" && type !== "add") ||
                !memberId ||
                !Number.isInteger(Number(memberId))
            ) {
                return;
            }
            try {
                setFetchError(null);
                setLoading(true);

                const options = {
                    method: type === "add" ? "put" : "delete",
                    headers: { "x-access-token": token },
                };
                const response = await fetch(
                    `${API_URL}/api/mygroups/${gid}/${memberId}`,
                    options,
                );
                if (!response.ok) {
                    const error = await response.json();
                    setFetchError(error.message);
                } else {
                    await fetchGroup();
                }
            } catch (err) {
                console.log(err);
                setFetchError(
                    err.message ||
                        `Error ${type === "add" ? "d'ajout" : "de suppresion"} d'un membre`,
                );
            } finally {
                setLoading(false);
            }
        },
        [token, gid, fetchGroup],
    );

    const addMember = useCallback(
        async (memberId) => {
            await manageMember("add", memberId);
        },
        [manageMember],
    );

    const deleteMember = useCallback(
        async (memberId) => {
            await manageMember("delete", memberId);
        },
        [manageMember],
    );

    const addMemberWS = useCallback(
        (memberId) => {
            if (!socket) {
                addMember(memberId);
                return;
            }
            socket.emit("addMember", { gid, uid: memberId }, (res) => {
                if (res.status == "NOK") setFetchError(res.message);
                else {
                    setFetchError(null);
                    fetchGroup();
                }
            });
        },
        [gid, socket, addMember, fetchGroup],
    );

    const deleteMemberWS = useCallback(
        (memberId) => {
            if (!socket) {
                deleteMember(memberId);
                return;
            }
            socket.emit("deleteMember", { gid, uid: memberId }, (res) => {
                if (res.status == "NOK") setFetchError(res.message);
                else {
                    setFetchError(null);
                    fetchGroup();
                }
            });
        },
        [gid, socket, deleteMember, fetchGroup],
    );

    // chargement initial : inline + ignore → lint content ET racecondition gérée avec boolean ignore
    useEffect(() => {
        if (!isValidGid) return;
        let ignore = false;
        requestGroup(gid, token)
            .then((g) => {
                if (!ignore) {
                    setGroup(g);
                    setFetchError(null);
                }
            })
            .catch((e) => {
                if (!ignore)
                    setFetchError(
                        e.message || "Error de recuperation du groupe",
                    );
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [gid, token, isValidGid]);

    return {
        error,
        loading,
        group,
        addMember,
        deleteMember,
        addMemberWS,
        deleteMemberWS,
    };
}
