import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Connection } from "@/views/Connection";
import { AuthContextProvider } from "@/contexts/AuthProvider";

function renderConnection() {
    return render(
        <AuthContextProvider>
            <Connection />
        </AuthContextProvider>,
    );
}

describe("Connection integration", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
        document.cookie = "ACCESS_TOKEN_AUTH=";
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("connects the signup form to the login form", async () => {
        const user = userEvent.setup();
        fetch
            .mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: "Token missing" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ status: "success" }),
            });
        renderConnection();

        await user.type(screen.getByLabelText("Nom"), "Integration User");
        await user.type(
            screen.getByLabelText("Email", { selector: "#emailSignUp" }),
            "integration@example.com",
        );
        await user.type(screen.getByLabelText("Mot de passe"), "secret123");
        await user.type(
            screen.getByLabelText("Confimer votre Mot de passe"),
            "secret123",
        );
        await user.click(screen.getAllByRole("button", { name: "OK" })[1]);

        expect(fetch).toHaveBeenNthCalledWith(1, "/api/me", {
            credentials: "include",
        });
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            "/register",
            expect.objectContaining({ method: "POST" }),
        );
        await waitFor(() => {
            expect(
                screen.getByLabelText("Email", { selector: "#emailLogin" }),
            ).toHaveValue("integration@example.com");
        });
    });

    it("displays the API error through the login form", async () => {
        const user = userEvent.setup();
        fetch
            .mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: "Token missing" }),
            })
            .mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: "Wrong email/password" }),
            });
        renderConnection();

        await user.type(
            screen.getByLabelText("Email", { selector: "#emailLogin" }),
            "wrong@example.com",
        );
        await user.type(screen.getByLabelText("Mot de Passe"), "secret123");
        await user.click(screen.getAllByRole("button", { name: "OK" })[0]);

        expect(
            await screen.findByText("Wrong email/password"),
        ).toBeInTheDocument();

        expect(fetch).toHaveBeenNthCalledWith(
            2,
            "/login",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
            }),
        );
    });
});
