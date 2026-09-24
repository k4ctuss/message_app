const app = require("../app");
const request = require("supertest");

let noGroupUserTK;
let chiefUserTK;
let memberUserTK;
let adminTK;
let chiefUserId;
let memberUserId;
let adminUserId;
let chiefGroupId;

/* ----------  set up for the group --------------- */
beforeAll(async () => {
    const credentials = [
        { email: "nogroup@test.test", password: "Agreat1$password" },
        { email: "chief@test.test", password: "Agreat1$password" },
        { email: "member@test.test", password: "Agreat1$password" },
        { email: "nolan.blanc@grenoble-inp.org", password: "123456" },
    ];
    // create needed users
    await request(app)
        .post("/register")
        .send({ ...credentials[0], name: "user without group" });

    await request(app)
        .post("/register")
        .send({ ...credentials[1], name: "user owning a group" });

    await request(app)
        .post("/register")
        .send({ ...credentials[2], name: "user owning a group" });

    // get their tokens
    const nogrResp = await request(app).post("/login").send(credentials[0]);
    noGroupUserTK = nogrResp.body.token;

    const chiefUser = await request(app).post("/login").send(credentials[1]);
    chiefUserTK = chiefUser.body.token;

    const memberUser = await request(app).post("/login").send(credentials[2]);
    memberUserTK = memberUser.body.token;

    const nolan = await request(app).post("/login").send(credentials[3]);
    adminTK = nolan.body.token;

    const usersResp = await request(app)
        .get("/api/users")
        .set("x-access-token", adminTK);
    const usersByMail = usersResp.body.users.reduce((acc, u) => {
        acc[u.email] = u;
        return acc;
    }, {});
    chiefUserId = usersByMail["chief@test.test"].id;
    memberUserId = usersByMail["member@test.test"].id;
    adminUserId = usersByMail["nolan.blanc@grenoble-inp.org"].id;
});

test("Test create groups", async () => {
    let response = await request(app)
        .post("/api/mygroups")
        .set("x-access-token", chiefUserTK)
        .send({ name: "chief's group" });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Group added");

    response = await request(app)
        .post("/api/mygroups")
        .set("x-access-token", chiefUserTK)
        .send({ group: "chief's group" });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Group name not provided");

    // pas deux groupes du même nom
    response = await request(app)
        .post("/api/mygroups")
        .set("x-access-token", chiefUserTK)
        .send({ name: "chief's group" });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("name already use");

    response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", chiefUserTK);
    const chiefGroup = response.body.groups.find(
        (g) => g.name === "chief's group",
    );
    chiefGroupId = chiefGroup.id;
});

test("Test list all my groups (with admin also).", async () => {
    let response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", chiefUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning my groups");
    expect(response.body).toHaveProperty("groups");
    expect(response.body.groups.length).toBe(1);

    response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", noGroupUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning my groups");
    expect(response.body).toHaveProperty("groups");
    expect(response.body.groups.length).toBe(0);

    response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", adminTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning my groups");
    expect(response.body).toHaveProperty("groups");
    expect(response.body.groups.length).toBe(2);
});

test(`Test add member in group id ${chiefGroupId}`, async () => {
    let response = await request(app)
        .put(`/api/mygroups/${chiefGroupId}/${memberUserId}`)
        .set("x-access-token", memberUserTK);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");

    response = await request(app)
        .put(`/api/mygroups/${chiefGroupId}/${memberUserId}`)
        .set("x-access-token", chiefUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("New member added");

    response = await request(app)
        .put(`/api/mygroups/${chiefGroupId}/${chiefUserId}`)
        .set("x-access-token", adminTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("New member added");
});

test(`Test list members in group id ${chiefGroupId}`, async () => {
    let response = await request(app)
        .get(`/api/mygroups/${chiefGroupId}`)
        .set("x-access-token", memberUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning all members");
    expect(response.body.members.length).toBe(2);

    response = await request(app)
        .get(`/api/mygroups/${chiefGroupId}`)
        .set("x-access-token", chiefUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning all members");
    expect(response.body.members.length).toBe(2);

    response = await request(app)
        .get(`/api/mygroups/${chiefGroupId}`)
        .set("x-access-token", adminTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning all members");
    expect(response.body.members.length).toBe(2);

    response = await request(app)
        .get(`/api/mygroups/${chiefGroupId}`)
        .set("x-access-token", noGroupUserTK);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");
});

test("Test groupsmember endpoint", async () => {
    let response = await request(app)
        .get("/api/groupsmember")
        .set("x-access-token", memberUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
        "Returning all groups of which user is a member",
    );
    expect(response.body.groups.length).toBe(1);
    expect(response.body.groups[0].id).toBe(chiefGroupId);

    response = await request(app)
        .get("/api/groupsmember")
        .set("x-access-token", chiefUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
        "Returning all groups of which user is a member",
    );
    expect(response.body.groups.length).toBe(1);
    expect(response.body.groups[0].id).toBe(chiefGroupId);

    response = await request(app)
        .get("/api/groupsmember")
        .set("x-access-token", adminTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
        "Returning all groups of which user is a member",
    );
    expect(response.body.groups.some((g) => g.id === 1)).toBe(true);
});

test("Test delete member in group", async () => {
    let response = await request(app)
        .delete(`/api/mygroups/${chiefGroupId}/${chiefUserId}`)
        .set("x-access-token", memberUserTK);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");

    response = await request(app)
        .delete(`/api/mygroups/${chiefGroupId}/${memberUserId}`)
        .set("x-access-token", memberUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Member deleted");

    response = await request(app)
        .get("/api/groupsmember")
        .set("x-access-token", memberUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.groups.length).toBe(0);

    response = await request(app)
        .put(`/api/mygroups/${chiefGroupId}/${memberUserId}`)
        .set("x-access-token", chiefUserTK);
    expect(response.statusCode).toBe(200);

    response = await request(app)
        .delete(`/api/mygroups/${chiefGroupId}/${memberUserId}`)
        .set("x-access-token", chiefUserTK);
    expect(response.statusCode).toBe(200);

    response = await request(app)
        .delete(`/api/mygroups/${chiefGroupId}/${chiefUserId}`)
        .set("x-access-token", adminTK);
    expect(response.statusCode).toBe(200);
});

test("Test delete group", async () => {
    let response = await request(app)
        .delete(`/api/mygroups/${chiefGroupId}`)
        .set("x-access-token", memberUserTK);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");

    response = await request(app)
        .delete(`/api/mygroups/${chiefGroupId}`)
        .set("x-access-token", chiefUserTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("group deleted");

    response = await request(app)
        .post("/api/mygroups")
        .set("x-access-token", chiefUserTK)
        .send({ name: "chief's second group" });
    expect(response.statusCode).toBe(200);

    response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", chiefUserTK);
    const recreated = response.body.groups.find(
        (g) => g.name === "chief's second group",
    );
    expect(recreated).toBeDefined();

    response = await request(app)
        .delete(`/api/mygroups/${recreated.id}`)
        .set("x-access-token", adminTK);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("group deleted");

    expect(adminUserId).toBe(1);
});
