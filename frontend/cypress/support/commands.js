function apiUrl() {
  return Cypress.env("apiUrl") || "http://localhost:3000";
}

function authHeaders(token) {
  return { "x-access-token": token, "content-type": "application/json" };
}

Cypress.Commands.add("clearAuth", () => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.visit("/", {
    onBeforeLoad(win) {
      win.document.cookie = "ACCESS_TOKEN_AUTH=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    },
  });
});

Cypress.Commands.add("registerApi", (account) => {
  cy.request({
    method: "POST",
    url: `${apiUrl()}/register`,
    body: {
      name: account.name,
      email: account.email,
      password: account.password,
    },
  }).then((response) => {
    expect(response.status).to.eq(200);
  });
});

Cypress.Commands.add("loginApi", (account) => {
  return cy
    .request({
      method: "POST",
      url: `${apiUrl()}/login`,
      body: { email: account.email, password: account.password },
      failOnStatusCode: false,
    })
    .then((response) => {
      if (response.status !== 200) {
        return { token: null, user: null };
      }
      return { token: response.body.token, user: response.body.user };
    });
});

Cypress.Commands.add("createGroupApi", (session, name) => {
  cy.request({
    method: "POST",
    url: `${apiUrl()}/api/mygroups`,
    headers: authHeaders(session.token),
    body: { name },
  }).then((response) => {
    expect(response.status).to.eq(200);
  });

  return cy
    .request({
      method: "GET",
      url: `${apiUrl()}/api/mygroups`,
      headers: authHeaders(session.token),
    })
    .then((response) => {
      const group = response.body.groups.find((g) => g.name === name);
      expect(group, `group ${name} should exist`).to.exist;
      return group;
    });
});

Cypress.Commands.add("addMemberApi", (session, groupId, userId) => {
  cy.request({
    method: "PUT",
    url: `${apiUrl()}/api/mygroups/${groupId}/${userId}`,
    headers: authHeaders(session.token),
  }).then((response) => {
    expect(response.status).to.eq(200);
  });
});

Cypress.Commands.add("loginUi", (account) => {
  cy.clearAuth();
  cy.get("#emailLogin").clear().type(account.email);
  cy.get("#passwordLogin").type(account.password, { log: false });
  cy.get("#emailLogin").closest("fieldset").find("button").click();
  cy.contains(`Bonjour ${account.name}`).should("be.visible");
});

Cypress.Commands.add("cleanupE2eAccount", (account) => {
  cy.loginApi(account).then((session) => {
    if (!session.token || !session.user) {
      return;
    }

    cy.request({
      method: "GET",
      url: `${apiUrl()}/api/mygroups`,
      headers: authHeaders(session.token),
      failOnStatusCode: false,
    }).then((response) => {
      const groups = response.body?.groups || [];
      groups.forEach((group) => {
        cy.request({
          method: "DELETE",
          url: `${apiUrl()}/api/mygroups/${group.id}`,
          headers: authHeaders(session.token),
          failOnStatusCode: false,
        });
      });
    });

    cy.request({
      method: "GET",
      url: `${apiUrl()}/api/groupsmember`,
      headers: authHeaders(session.token),
      failOnStatusCode: false,
    }).then((response) => {
      const groups = response.body?.groups || [];
      groups.forEach((group) => {
        cy.request({
          method: "DELETE",
          url: `${apiUrl()}/api/mygroups/${group.id}/${session.user.id}`,
          headers: authHeaders(session.token),
          failOnStatusCode: false,
        });
      });
    });

    cy.request({
      method: "DELETE",
      url: `${apiUrl()}/api/users/${session.user.id}`,
      headers: authHeaders(session.token),
      failOnStatusCode: false,
    });
  });
});

Cypress.Commands.add("cleanupE2eAccounts", (accounts) => {
  accounts.forEach((account) => {
    cy.cleanupE2eAccount(account);
  });
});
