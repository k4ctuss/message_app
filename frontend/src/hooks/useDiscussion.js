import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "@/contexts/socket-context";
import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export function useDiscussion(gid) {
    const { token } = useAuth();
    const { socket } = useSocket();

    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    const isValidGid = Boolean(gid) && Number.isInteger(Number(gid));
    const error = !isValidGid ? "groupe invalid" : fetchError;

    async function requestMessages(gid, token) {
        const res = await fetch(`${API_URL}/api/messages/${gid}`, {
            method: "GET",
            headers: { "x-access-token": token },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur de chargement");
        return data.messages;
    }

    const fetchMessages = useCallback(async () => {
        if (!isValidGid) return;

        try {
            setMessages(await requestMessages(gid, token));
            setFetchError(null);
        } catch (err) {
            console.error(err);
            setFetchError(
                err.message || "Error lors du chargement de la discussion",
            );
        } finally {
            setIsLoading(false);
        }
    }, [gid, token, isValidGid]);

    const addMessage = useCallback(
        async (content) => {
            if (!isValidGid) return;

            try {
                setFetchError(null);
                setIsRefetching(true);

                const options = {
                    method: "POST",
                    headers: {
                        "x-access-token": token,
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({ content: content }),
                };
                const response = await fetch(
                    `${API_URL}/api/messages/${gid}`,
                    options,
                );
                if (response.ok) {
                    await fetchMessages();
                } else {
                    const err = await response.json();
                    setFetchError(err.message);
                }
            } catch (err) {
                console.error(err);
                setFetchError(
                    err.messages || "Error lors du chargement de la discussion",
                );
            } finally {
                setIsRefetching(false);
            }
        },
        [gid, token, isValidGid, fetchMessages],
    );

    const sendMessage = useCallback(
        (content) => {
            if (!isValidGid) return;

            if (!socket) {
                addMessage(content);
                return;
            }
            socket.emit("newMessage", { gid, content }, (res) => {
                if (res.status === "NOK") setFetchError(res.message);
                else {
                    setFetchError(null);
                    fetchMessages();
                }
            });
        },
        [socket, gid, isValidGid, addMessage, fetchMessages],
    );

    //chargement initial + resync si token ou gid change, On ne peux pas appeler fetch message car la usecallbakc empeche lint de voir que les setState son fait apres les await.
    useEffect(() => {
        if (!isValidGid) return;
        let ignore = false;

        requestMessages(gid, token)
            .then((msgs) => {
                if (ignore) return;
                setMessages(msgs);
                setFetchError(null);
            })
            .catch((e) => {
                if (!ignore) setFetchError(e.message);
            })
            .finally(() => {
                if (!ignore) setIsLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [gid, token, isValidGid]);

    //abonnement socket (une responsabilité séparée)
    useEffect(() => {
        if (!socket || !isValidGid) return;

        socket.emit("joinDiscussion", gid);

        const onReceive = (message) => {
            console.log("received", message);
            setMessages((prev) => [...prev, message]);
        };
        socket.on("receivedMessage", onReceive);

        // clean up
        return () => {
            socket.off("receivedMessage", onReceive);
            socket.emit("leaveDiscussion", gid);
        };
    }, [socket, gid, isValidGid]);

    return {
        isLoading,
        isRefetching,
        error,
        messages,
        addMessage,
        sendMessage,
    };
}
