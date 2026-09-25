const { QueryTypes } = require("sequelize");
const { randomUUID } = require("crypto");
const app = require("../app");
const request = require("supertest");

const db = require("../models/database");

const USERS_TABLE = '"users"';
const GROUPS_TABLE = '"groups"';
const ISMEMBER_TABLE = '"isMember"';
const MESSAGE_TABLE = '"messages"';

const STRONG_PASSWORD = "1Mot2passe*";

function select(sql, replacements = {}) {
    return db.query(sql, { replacements, type: QueryTypes.SELECT });
}

// Tous les emails générés par ce fichier : c'est ce qu'on supprime en afterAll.
// Suppression ciblée (jamais de TRUNCATE) pour ne pas gêner les autres fichiers
// qui tournent en parallèle sur la même base.
function uniqueEmail(label, createdEmails) {
    const email = `user-test+${label}-${randomUUID()}@test.test`;
    createdEmails.add(email);
    return email;
}

async function findUsersByEmail(email) {
    return select(
        `SELECT id, email, name FROM ${USERS_TABLE} WHERE email = :email`,
        { email },
    );
}

async function findUserById(id) {
    const rows = await db.query(
        `SELECT id, email, name FROM ${USERS_TABLE} WHERE id = :id`,
        { replacements: { id }, type: QueryTypes.SELECT },
    );
    return rows[0] ?? null;
}

// Crée un user via l'API, se connecte, vérifie chaque étape.

async function makeAdmin(email) {
    await db.query(
        `UPDATE ${USERS_TABLE} SET "isAdmin" = true WHERE email = :email`,
        { replacements: { email } },
    );
    const rows = await select(
        `SELECT "isAdmin" FROM ${USERS_TABLE} WHERE email = :email`,
        { email },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].isAdmin).toBe(true);
}

async function createTestUser(
    label,
    createdEmails,
    { admin = false, ...overrides } = {},
) {
    const user = {
        name: `test-${label}`,
        email: uniqueEmail(label, createdEmails),
        password: STRONG_PASSWORD,
        ...overrides,
    };

    const reg = await request(app).post("/register").send(user);
    expect(reg.status).toBe(200);

    if (admin) await makeAdmin(user.email);

    const login = await request(app)
        .post("/login")
        .send({ email: user.email, password: user.password });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
    expect(login.body.user.id).toBeDefined();

    return { ...user, id: login.body.user.id, token: login.body.token };
}

// groups
function uniqueGroupName(label, createdGroups) {
    const name = `${label} ${randomUUID()}`;
    createdGroups.add(name);
    return name;
}

async function createTestGroup(owner, label, createdGroups) {
    const name = uniqueGroupName(label, createdGroups);

    let response = await request(app)
        .post("/api/mygroups")
        .set("x-access-token", owner.token)
        .send({ name });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Group added");

    response = await request(app)
        .get("/api/mygroups")
        .set("x-access-token", owner.token);
    expect(response.statusCode).toBe(200);
    const group = response.body.groups.find((g) => g.name === name);
    expect(group).toBeDefined();

    const rows = await findGroupsByName(name);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(group.id);

    return { id: group.id, name };
}

function findGroupsByName(name) {
    return select(`SELECT id, name FROM ${GROUPS_TABLE} WHERE name = :name`, {
        name,
    });
}

async function findGroupById(id) {
    const rows = await select(
        `SELECT id, name
         FROM ${GROUPS_TABLE} WHERE id = :id`,
        { id },
    );
    return rows[0] ?? null;
}

async function isMember(groupId, userId) {
    const rows = await select(
        `SELECT 1 FROM ${ISMEMBER_TABLE}
         WHERE "groupId" = :groupId AND "userId" = :userId`,
        { groupId, userId },
    );
    return rows.length > 0;
}

async function countMembers(groupId) {
    const rows = await select(
        `SELECT COUNT(*)::int AS count FROM ${ISMEMBER_TABLE} WHERE "groupId" = :groupId`,
        { groupId },
    );
    return rows[0].count;
}

async function addMember(groupId, userId) {
    await db.query(
        `INSERT INTO ${ISMEMBER_TABLE} VALUES (:userId, :groupId, now(), now())`,
        { replacements: { userId, groupId } },
    );
    expect(await isMember(groupId, userId)).toBe(true);
}

// message:
function findMessagesByContent(content) {
    return select(
        `SELECT content FROM ${MESSAGE_TABLE} WHERE content = :content`,
        { content },
    );
}

// clean database
async function cleanUp(createdEmails, createdGroups) {
    try {
        if (createdGroups != null) {
            const groups = [...createdGroups];
            if (groups.length > 0) {
                await db.query(
                    `DELETE FROM ${GROUPS_TABLE} WHERE name IN (:groups)`,
                    {
                        replacements: { groups },
                    },
                );
                // On vérifie que le nettoyage a bien fonctionné.
                const leftg = await db.query(
                    `SELECT id FROM ${GROUPS_TABLE} WHERE name IN (:groups)`,
                    { replacements: { groups }, type: QueryTypes.SELECT },
                );
                expect(leftg).toHaveLength(0);
            }
        }

        const emails = [...createdEmails];
        if (emails.length > 0) {
            await db.query(
                `DELETE FROM ${USERS_TABLE} WHERE email IN (:emails)`,
                {
                    replacements: { emails },
                },
            );
            // On vérifie que le nettoyage a bien fonctionné.
            const left = await db.query(
                `SELECT id FROM ${USERS_TABLE} WHERE email IN (:emails)`,
                { replacements: { emails }, type: QueryTypes.SELECT },
            );
            expect(left).toHaveLength(0);
        }
    } finally {
        await db.close();
    }
}

module.exports = {
    STRONG_PASSWORD,
    uniqueEmail,
    findUserById,
    findUsersByEmail,
    createTestUser,
    uniqueGroupName,
    createTestGroup,
    findGroupsByName,
    findGroupById,
    isMember,
    countMembers,
    addMember,
    findMessagesByContent,
    cleanUp,
};
