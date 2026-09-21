import { uniqueAccount, uniqueGroupName } from "../../support/e2e-users";

describe("Group discussion", () => {
  const owner = uniqueAccount("owner");
  const member = uniqueAccount("member");
  const groupName = uniqueGroupName("E2e Chat");
  const firstMessage = "Salut a tous";
  const replyMessage = "Hello oui";
  let groupId;

  before(() => {
    cy.registerApi(owner);
    cy.registerApi(member);

    cy.loginApi(owner).then((ownerSession) => {
      cy.createGroupApi(ownerSession, groupName).then((group) => {
        groupId = group.id;
        cy.addMemberApi(ownerSession, group.id, ownerSession.user.id);
        cy.loginApi(member).then((memberSession) => {
          cy.addMemberApi(ownerSession, group.id, memberSession.user.id);
        });
      });
    });
  });

  after(() => {
    cy.cleanupE2eAccounts([owner, member]);
  });

  it("shows an empty discussion to a member", () => {
    cy.loginUi(member);
    cy.contains("h2", "Ceux dont je suis membre")
      .parent()
      .contains("a", groupName)
      .click();
    cy.contains(`Discussion dans le groupe ${groupName}`).should("be.visible");
    cy.contains("Aucun message pour le moment").should("be.visible");
  });

  it("lets a member send a message", () => {
    cy.loginUi(member);
    cy.contains("a", groupName).click();
    cy.get("[data-cy=new-message]").type(firstMessage);
    cy.get("[data-cy=send-message]").click();
    cy.contains(firstMessage).should("be.visible");
  });

  it("shows the member message to the owner and lets the owner reply", () => {
    cy.loginUi(owner);
    cy.contains("h2", "Ceux dont je suis membre")
      .parent()
      .contains("a", groupName)
      .click();
    cy.contains(firstMessage).should("be.visible");
    cy.contains(member.name).should("be.visible");

    cy.get("[data-cy=new-message]").type(replyMessage);
    cy.get("[data-cy=send-message]").click();
    cy.contains(replyMessage).should("be.visible");
  });

  it("lets a member leave the group", () => {
    cy.loginUi(member);
    cy.contains("a", groupName).click();
    cy.get("[data-cy=leave-group]").click();
    cy.contains("Mes Groupes").should("be.visible");
    cy.contains("h2", "Ceux dont je suis membre")
      .parent()
      .contains("a", groupName)
      .should("not.exist");
  });

  it("keeps the conversation available to remaining members", () => {
    expect(groupId).to.be.a("number");
    cy.loginUi(owner);
    cy.contains("a", groupName).click();
    cy.contains(firstMessage).should("be.visible");
    cy.contains(replyMessage).should("be.visible");
  });
});
