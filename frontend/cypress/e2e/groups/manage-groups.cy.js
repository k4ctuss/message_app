import { uniqueAccount, uniqueGroupName } from "../../support/e2e-users";

describe("Group management", () => {
  const owner = uniqueAccount("owner");
  const member = uniqueAccount("member");
  const groupName = uniqueGroupName();

  before(() => {
    cy.registerApi(owner);
    cy.registerApi(member);
  });

  after(() => {
    cy.cleanupE2eAccounts([owner, member]);
  });

  it("lets an owner create a group from the home page", () => {
    cy.loginUi(owner);
    cy.get("[data-cy=create-group]").should("be.disabled");
    cy.get("[data-cy=new-group-name]").type(groupName);
    cy.get("[data-cy=create-group]").click();
    cy.contains("a", groupName).should("be.visible");
  });

  it("rejects a duplicate group name", () => {
    cy.loginUi(owner);
    cy.get("[data-cy=new-group-name]").type(groupName);
    cy.get("[data-cy=create-group]").click();
    cy.contains("name already use").should("be.visible");
  });

  it("lets the owner add then remove a member", () => {
    cy.loginUi(owner);
    cy.contains("a", groupName).click();
    cy.contains(`Administration "${groupName}"`).should("be.visible");

    cy.get("[data-cy=select-member]").should("not.be.disabled").click();
    cy.contains("[data-slot=select-item]", member.email).click();
    cy.get("[data-cy=add-member]").should("not.be.disabled").click();
    cy.contains(member.email).should("be.visible");

    cy.contains(member.email)
      .parent()
      .find("button")
      .contains("Supprimer")
      .click();
    cy.contains(`Administration "${groupName}"`).should("be.visible");
    cy.contains(member.email).should("not.exist");
  });

  it("shows the group to a member, not as an owned group", () => {
    cy.loginApi(owner).then((session) => {
      cy.request({
        method: "GET",
        url: `${Cypress.env("apiUrl") || "http://localhost:3000"}/api/mygroups`,
        headers: { "x-access-token": session.token },
      }).then((response) => {
        const group = response.body.groups.find((g) => g.name === groupName);
        expect(group).to.exist;
        cy.loginApi(member).then((memberSession) => {
          cy.addMemberApi(session, group.id, memberSession.user.id);
        });
      });
    });

    cy.loginUi(member);
    cy.contains("h2", "Ceux dont je suis membre")
      .parent()
      .contains("a", groupName)
      .should("be.visible");
    cy.contains("h2", "Ceux que j'administre")
      .parent()
      .contains("a", groupName)
      .should("not.exist");
  });
});
