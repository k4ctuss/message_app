const app = require("../app");
const request = require("supertest");
const { randomUUID } = require("crypto");

const {
    createTestUser,
    findMessagesByContent,
    addMember,
    createTestGroup,
    cleanUp,
} = require("./helper");

const createdEmails = new Set();
const createdGroups = new Set();

let owner;
let member;
let outsider;
let group;

beforeAll(async() => {
    owner = await createTestUser("msg-owner", createdEmails);
    member = await createTestUser("msg-member", createdEmails);
    outsider = await createTestUser("msg-outsider", createdEmails);

    group = await createTestGroup(owner, "messages-group", createdGroups);
    await addMember(group.id, member.id);
});

afterAll(async() => {
    await cleanUp(createdEmails, createdGroups);
});

test("Test create message", async() => {
    let response = await request(app)
        .post(`/api/messages/${group.id}`)
        .set("x-access-token", member.token);
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("message content not provided");

    // Sans token : refusé, et rien n'est écrit en base
    const noTokenContent = `message without token ${randomUUID()}`;
    response = await request(app)
        .post(`/api/messages/${group.id}`)
        .send({ content: noTokenContent });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Token missing");
    expect(await findMessagesByContent(noTokenContent)).toHaveLength(0);

    // Non-membre : refusé, et rien n'est écrit en base
    const outsiderContent = `outsider message ${randomUUID()}`;
    response = await request(app)
        .post(`/api/messages/${group.id}`)
        .set("x-access-token", outsider.token)
        .send({ content: outsiderContent });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");
    expect(await findMessagesByContent(outsiderContent)).toHaveLength(0);

    // Membre : accepté, et le message est bien en base
    const content = `message test ${randomUUID()}`;
    response = await request(app)
        .post(`/api/messages/${group.id}`)
        .set("x-access-token", member.token)
        .send({ content });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("message added");
    expect(await findMessagesByContent(content)).toHaveLength(1);
});

test("Test get messages", async() => {
    // Le test crée son propre message au lieu de dépendre du test précédent
    const content = `message to read ${randomUUID()}`;
    let response = await request(app)
        .post(`/api/messages/${group.id}`)
        .set("x-access-token", member.token)
        .send({ content });
    expect(response.statusCode).toBe(200);
    expect(await findMessagesByContent(content)).toHaveLength(1);

    response = await request(app).get(`/api/messages/${group.id}`);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Token missing");

    response = await request(app)
        .get(`/api/messages/${group.id}`)
        .set("x-access-token", outsider.token);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");

    response = await request(app)
        .get(`/api/messages/${group.id}`)
        .set("x-access-token", member.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Return all messages");
    expect(response.body.messages.some((m) => m.content === content)).toBe(
        true,
    );
});
