import { uniqueAccount } from "../../support/e2e-users";

describe("Authentication", () => {
    describe("Sign up", () => {
        const account = uniqueAccount("visitor");

        after(() => {
            cy.cleanupE2eAccounts([account]);
        });

        it("registers a new user through the real backend", () => {
            cy.clearAuth();
            cy.get("#name").type(account.name);
            cy.get("#emailSignUp").type(account.email);
            cy.get("#passwordSignUp").type(account.password, { log: false });
            cy.get("#passwordVerif").type(account.password, { log: false });
            cy.get("#emailSignUp").closest("fieldset").find("button").click();

            cy.get("#emailLogin").should("have.value", account.email);
            cy.get("#name").should("have.value", "");
        });

        it("rejects mismatched passwords without creating a session", () => {
            cy.clearAuth();
            cy.get("#name").type("Dana User");
            cy.get("#emailSignUp").type(`mismatch.${Date.now()}@example.com`);
            cy.get("#passwordSignUp").type("E2ePass1!", { log: false });
            cy.get("#passwordVerif").type("E2ePass2!", { log: false });

            cy.contains("Mots de passe différents !").should("be.visible");
            cy.get("#emailSignUp")
                .closest("fieldset")
                .find("button")
                .should("be.disabled");
        });
    });

    describe("Login and logout", () => {
        const account = uniqueAccount("visitor");

        before(() => {
            cy.registerApi(account);
        });

        after(() => {
            cy.cleanupE2eAccounts([account]);
        });

        it("logs in with a freshly created user", () => {
            cy.loginUi(account);
            cy.contains("Mes Groupes").should("be.visible");
        });

        it("shows an error for a wrong password", () => {
            cy.clearAuth();
            cy.get("#emailLogin").type(account.email);
            cy.get("#passwordLogin").type("WrongPass1!", { log: false });
            cy.get("#emailLogin").closest("fieldset").find("button").click();

            cy.contains("Wrong email/password").should("be.visible");
            cy.get("#emailLogin").should("be.visible");
        });

        it("logs out and returns to the connection screen", () => {
            cy.loginUi(account);
            cy.get("[data-cy=logout]").click();
            cy.get("#emailLogin").should("be.visible");
            cy.contains("Se Connecter").should("be.visible");
        });
    });
});
