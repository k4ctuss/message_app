import { useSocket } from "@/contexts/socket-context";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/config/api";

export function useDiscussion(gid) {
    const { socket } = useSocket();

    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    const isValidGid = Boolean(gid) && Number.isInteger(Number(gid));
    const error = !isValidGid ? "groupe invalid" : fetchError;

    const requestMessages = useCallback(async () => {
        const res = await fetch(`${API_URL}/api/messages/${gid}`, {
            method: "GET",
            credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur de chargement");
        return data.messages;
    }, [gid]);

    const appendMessage = useCallback((message) => {
        setMessages((currentMessages) => {
            if (currentMessages.some((current) => current.id === message.id)) {
                return currentMessages;
            }
            return [...currentMessages, message];
        });
    }, []);

    const fetchMessages = useCallback(async () => {
        if (!isValidGid) return;

        try {
            setMessages(await requestMessages());
            setFetchError(null);
        } catch (err) {
            console.error(err);
            setFetchError(
                err.message || "Error lors du chargement de la discussion",
            );
        } finally {
            setIsLoading(false);
        }
    }, [isValidGid, requestMessages]);

    const addMessage = useCallback(
        async (content) => {
            if (!isValidGid) return;

            try {
                setFetchError(null);
                setIsRefetching(true);

                const options = {
                    method: "POST",
                    credentials: "include",
                    headers: {
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
        [gid, isValidGid, fetchMessages],
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
                }
            });
        },
        [socket, gid, isValidGid, addMessage],
    );

    // Chargement initial et resynchronisation lorsque le groupe change.
    useEffect(() => {
        if (!isValidGid) return;
        let ignore = false;

        requestMessages()
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
    }, [isValidGid, requestMessages]);

    //abonnement socket (une responsabilité séparée)
    useEffect(() => {
        if (!socket || !isValidGid) return;

        socket.emit("joinDiscussion", gid);

        const onReceive = (message) => {
            appendMessage(message);
        };
        socket.on("receivedMessage", onReceive);

        // clean up
        return () => {
            socket.off("receivedMessage", onReceive);
            socket.emit("leaveDiscussion", gid);
        };
    }, [socket, gid, isValidGid, appendMessage]);

    return {
        isLoading,
        isRefetching,
        error,
        messages,
        addMessage,
        sendMessage,
    };
}
