import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "@/contexts/socket-context";
import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

async function requestGroups(type, token) {
    const endpoint = `${API_URL}/api/${type === "admin" ? "mygroups" : "groupsmember"}`;
    const res = await fetch(endpoint, { headers: { "x-access-token": token } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data.groups;
}

export function useGroups(type = "member") {
    const { token } = useAuth();
    const { socket } = useSocket();

    const [groups, setGroups] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchGroups = useCallback(async () => {
        try {
            setGroups(await requestGroups(type, token));
            setError(null);
        } catch (err) {
            setError(
                err.message ||
                    "Une erreur s'est produite au chargement des groupes",
            );
        } finally {
            setLoading(false);
        }
    }, [token, type]);

    const createGroup = useCallback(
        async (name) => {
            try {
                setError(null);
                setLoading(true);
                const options = {
                    method: "POST",
                    headers: {
                        "x-access-token": token,
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({ name: name }),
                };
                const response = await fetch(
                    `${API_URL}/api/mygroups`,
                    options,
                );
                if (response.ok) {
                    fetchGroups();
                } else {
                    const error = await response.json();
                    setError(error.message);
                }
            } catch (err) {
                setError(
                    err.message ||
                        "Une erreur s'est produite à la création du groupe",
                );
            } finally {
                setLoading(false);
            }
        },
        [token, fetchGroups],
    );

    // chargement initial : inline + ignore → lint content ET race gérée
    useEffect(() => {
        let ignore = false;
        requestGroups(type, token)
            .then((g) => {
                if (!ignore) {
                    setGroups(g);
                    setError(null);
                }
            })
            .catch((e) => {
                if (!ignore) setError(e.message || "Erreur de chargement");
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, [type, token]);

    useEffect(() => {
        if (!socket) return;

        const addGroup = (group) => setGroups((prev) => [...prev, group]);
        const deleteGroup = (group) =>
            setGroups((prev) => prev.filter((g) => g.id !== group.id));

        socket.on(`addedToGroup_${type}`, addGroup);
        socket.on(`deleteGroup_${type}`, deleteGroup);
        return () => {
            socket.off(`addedToGroup_${type}`, addGroup);
            socket.off(`deleteGroup_${type}`, deleteGroup);
        };
    }, [socket, type]);

    return {
        groups,
        error,
        loading,
        createGroup,
    };
}
