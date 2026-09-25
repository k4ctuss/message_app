const app = require("../app");
const request = require("supertest");

const {
	createTestUser,
	uniqueGroupName,
	findGroupsByName,
	findGroupById,
	isMember,
	countMembers,
	addMember,
	createTestGroup,
	cleanUp,
} = require("./helper")


const createdEmails = new Set();
const createdGroups = new Set();

/* ----------  set up for the group --------------- */


afterAll(async()=>{
	await cleanUp(createdEmails, createdGroups);
});

test("Test create groups", async() => {

	const chief = await createTestUser("chief", createdEmails);
	const name = uniqueGroupName("chief-group", createdGroups);

    let response = await request(app)
        .post("/api/mygroups")
        .set("x-access-token", chief.token)
        .send({ name });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Group added");
    expect(await findGroupsByName(name)).toHaveLength(1);
 
    response = await request(app)
        .post("/api/mygroups")
        .set("x-access-token", chief.token)
        .send({ group: name });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Group name not provided");
 
    // pas deux groupes du même nom
    response = await request(app)
        .post("/api/mygroups")
        .set("x-access-token", chief.token)
        .send({ name });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("name already use");
    expect(await findGroupsByName(name)).toHaveLength(1);
 
    // Le groupe créé est bien listé, avec le même id qu'en base
    response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", chief.token);
    const created = response.body.groups.find((g) => g.name === name);
    expect(created).toBeDefined();
    expect(created.id).toBe((await findGroupsByName(name))[0].id);
});

test("Test list all my groups (with admin also).", async() => {
    const chief = await createTestUser("chief", createdEmails);
    const noGroup = await createTestUser("nogroup", createdEmails);
    const admin = await createTestUser("admin", createdEmails, { admin: true });
    const chiefGroup = await createTestGroup(chief, "list-group", createdGroups);
 
    let response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", chief.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning my groups");
    expect(response.body).toHaveProperty("groups");
    expect(response.body.groups.length).toBe(1);
    expect(response.body.groups[0].id).toBe(chiefGroup.id);
 
    response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", noGroup.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning my groups");
    expect(response.body).toHaveProperty("groups");
    expect(response.body.groups.length).toBe(0);
 
    // L'admin voit les groupes des autres. On ne teste pas le nombre exact :
    // il dépendrait des groupes créés par les autres fichiers en parallèle.
    response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", admin.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning my groups");
    expect(response.body).toHaveProperty("groups");
    expect(response.body.groups.some((g) => g.id === chiefGroup.id)).toBe(true);
});

test("Test add member in group ", async() => {
    const chief = await createTestUser("chief", createdEmails);
    const member = await createTestUser("member", createdEmails);
    const admin = await createTestUser("admin", createdEmails, { admin: true });
    const group = await createTestGroup(chief, "add-member-group", createdGroups);
 
    // Un simple user ne peut pas s'ajouter lui-même
    let response = await request(app)
        .put(`/api/mygroups/${group.id}/${member.id}`)
        .set("x-access-token", member.token);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");
    expect(await isMember(group.id, member.id)).toBe(false);
 
    // Le chef ajoute un membre
    response = await request(app)
        .put(`/api/mygroups/${group.id}/${member.id}`)
        .set("x-access-token", chief.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("New member added");
    expect(await isMember(group.id, member.id)).toBe(true);
 
    // L'admin peut ajouter quelqu'un dans un groupe qui n'est pas le sien
    response = await request(app)
        .put(`/api/mygroups/${group.id}/${chief.id}`)
        .set("x-access-token", admin.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("New member added");
    expect(await isMember(group.id, chief.id)).toBe(true);
 
    expect(await countMembers(group.id)).toBe(2);
});

test("Test list members in group", async () => {
    const chief = await createTestUser("chief", createdEmails);
    const member = await createTestUser("member", createdEmails);
    const noGroup = await createTestUser("nogroup", createdEmails);
    const admin = await createTestUser("admin", createdEmails, { admin: true });
    const group = await createTestGroup(chief, "list-members-group", createdGroups);
    await addMember(group.id, member.id);
    await addMember(group.id, chief.id);
    expect(await countMembers(group.id)).toBe(2);
 
    for (const viewer of [member, chief, admin]) {
        const response = await request(app)
            .get(`/api/mygroups/${group.id}`)
            .set("x-access-token", viewer.token);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Returning all members");
        expect(response.body.members.length).toBe(2);
        expect(response.body.members.map((m) => m.id)).toEqual(
            expect.arrayContaining([member.id, chief.id]),
        );
    }
 
    const response = await request(app)
        .get(`/api/mygroups/${group.id}`)
        .set("x-access-token", noGroup.token);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");
});
 
test("Test groupsmember endpoint", async () => {
    const chief = await createTestUser("chief", createdEmails);
    const member = await createTestUser("member", createdEmails);
    const admin = await createTestUser("admin", createdEmails, { admin: true });
    const chiefGroup = await createTestGroup(chief, "member-group", createdGroups);
    await addMember(chiefGroup.id, member.id);
    await addMember(chiefGroup.id, chief.id);
 
    // Groupe dont l'admin est lui-même membre (remplace l'ancien groupe id 1 du seed)
    const adminGroup = await createTestGroup(admin, "admin-group", createdGroups);
    await addMember(adminGroup.id, admin.id);
 
    let response = await request(app)
        .get("/api/groupsmember")
        .set("x-access-token", member.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
        "Returning all groups of which user is a member",
    );
    expect(response.body.groups.length).toBe(1);
    expect(response.body.groups[0].id).toBe(chiefGroup.id);
 
    response = await request(app)
        .get("/api/groupsmember")
        .set("x-access-token", chief.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
        "Returning all groups of which user is a member",
    );
    expect(response.body.groups.length).toBe(1);
    expect(response.body.groups[0].id).toBe(chiefGroup.id);
 
    response = await request(app)
        .get("/api/groupsmember")
        .set("x-access-token", admin.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
        "Returning all groups of which user is a member",
    );
    expect(response.body.groups.some((g) => g.id === adminGroup.id)).toBe(true);
});
 
test("Test delete member in group", async () => {
    const chief = await createTestUser("chief", createdEmails);
    const member = await createTestUser("member", createdEmails);
    const admin = await createTestUser("admin", createdEmails, { admin: true });
    const group = await createTestGroup(chief, "delete-member-group", createdGroups);
    await addMember(group.id, member.id);
    await addMember(group.id, chief.id);
 
    // Un membre ne peut pas retirer le chef : refusé, le chef est toujours membre
    let response = await request(app)
        .delete(`/api/mygroups/${group.id}/${chief.id}`)
        .set("x-access-token", member.token);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");
    expect(await isMember(group.id, chief.id)).toBe(true);
 
    // Un membre peut se retirer lui-même
    response = await request(app)
        .delete(`/api/mygroups/${group.id}/${member.id}`)
        .set("x-access-token", member.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Member deleted");
    expect(await isMember(group.id, member.id)).toBe(false);
 
    response = await request(app)
        .get("/api/groupsmember")
        .set("x-access-token", member.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.groups.length).toBe(0);
 
    // Le chef le rajoute puis le retire
    await addMember(group.id, member.id);
 
    response = await request(app)
        .delete(`/api/mygroups/${group.id}/${member.id}`)
        .set("x-access-token", chief.token);
    expect(response.statusCode).toBe(200);
    expect(await isMember(group.id, member.id)).toBe(false);
 
    // L'admin retire le chef
    response = await request(app)
        .delete(`/api/mygroups/${group.id}/${chief.id}`)
        .set("x-access-token", admin.token);
    expect(response.statusCode).toBe(200);
    expect(await isMember(group.id, chief.id)).toBe(false);
    expect(await countMembers(group.id)).toBe(0);
});
 
test("Test delete group", async () => {
    const chief = await createTestUser("chief", createdEmails);
    const outsider = await createTestUser("outsider", createdEmails);
    const admin = await createTestUser("admin", createdEmails, { admin: true });
    const group = await createTestGroup(chief, "delete-group", createdGroups);
 
    // Un autre user ne peut pas supprimer le groupe : il existe toujours en base
    let response = await request(app)
        .delete(`/api/mygroups/${group.id}`)
        .set("x-access-token", outsider.token);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");
    expect(await findGroupById(group.id)).not.toBeNull();
 
    // Le chef supprime son groupe : 200, et il a disparu de la base
    response = await request(app)
        .delete(`/api/mygroups/${group.id}`)
        .set("x-access-token", chief.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("group deleted");
    expect(await findGroupById(group.id)).toBeNull();
 
    // Le chef peut recréer un groupe, que l'admin peut supprimer
    const second = await createTestGroup(chief, "second-group", createdGroups);
    response = await request(app)
        .delete(`/api/mygroups/${second.id}`)
        .set("x-access-token", admin.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("group deleted");
    expect(await findGroupById(second.id)).toBeNull();
});