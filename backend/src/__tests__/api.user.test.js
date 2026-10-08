const app = require("../app");
const request = require("supertest");
const jws = require("jws");
const { randomUUID } = require("crypto");

const {
    STRONG_PASSWORD,
    uniqueEmail,
    findUserById,
    findUsersByEmail,
    createTestUser,
    cleanUp,
} = require("./helper");

const TOKEN_UNKNOW_USER = jws.sign({
    header: { alg: "HS256" },
    payload: "unknown@test.unknow",
    secret: process.env.TOKENSECRET,
});

const createdEmails = new Set();

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

// User partagé, utilisé uniquement en lecture (login, liste). Les tests qui
// modifient ou suppriment un user créent le leur.
let sharedUser;

beforeAll(async() => {
    sharedUser = await createTestUser("shared", createdEmails);
});

afterAll(async() => {
    await cleanUp(createdEmails, null);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("Test user sign up", async() => {
    const email = uniqueEmail("signup", createdEmails);

    // Mot de passe faible
    let response = await request(app)
        .post("/register")
        .send({ email, name: "test", password: "123456" });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Weak password!");
    expect(await findUsersByEmail(email)).toHaveLength(0);

    // Email manquant
    response = await request(app)
        .post("/register")
        .send({ name: "test", password: "123456" });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("You must specify the name and email");

    // Nom manquant
    response = await request(app)
        .post("/register")
        .send({ email, password: "1Mot2passe" });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("You must specify the name and email");
    expect(await findUsersByEmail(email)).toHaveLength(0);

    // Inscription valide : le user existe bien en base
    response = await request(app)
        .post("/register")
        .send({ email, name: "test", password: STRONG_PASSWORD });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("User Added");
    let rows = await findUsersByEmail(email);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("test");
    const createdId = rows[0].id;

    // Doublon d'email : refusé, et le compte d'origine n'a pas bougé
    response = await request(app).post("/register").send({
        email,
        name: "test-deux",
        password: "1Mot2passe*plusfort",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Validation error");
    rows = await findUsersByEmail(email);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(createdId);
    expect(rows[0].name).toBe("test");

    // Le mot de passe d'origine fonctionne, celui du doublon non
    response = await request(app)
        .post("/login")
        .send({ email, password: STRONG_PASSWORD });
    expect(response.statusCode).toBe(200);
    response = await request(app)
        .post("/login")
        .send({ email, password: "1Mot2passe*plusfort" });
    expect(response.statusCode).toBe(403);
});

test("Test if user can log in and list users", async() => {
    let response = await request(app)
        .post("/login")
        .send({ email: sharedUser.email, password: sharedUser.password });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("token");

    response = await request(app)
        .get("/api/users")
        .set("x-access-token", response.body.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning users");
    expect(response.body.users.length).toBeGreaterThan(0);
});

test("Test user login", async() => {
    let response = await request(app)
        .post("/login")
        .send({ password: sharedUser.password });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
        "You must specify the email and password",
    );

    response = await request(app)
        .post("/login")
        .send({ email: sharedUser.email });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
        "You must specify the email and password",
    );

    const unknownEmail = `unknown-${randomUUID()}@test.test`;
    expect(await findUsersByEmail(unknownEmail)).toHaveLength(0);
    response = await request(app)
        .post("/login")
        .send({ email: unknownEmail, password: STRONG_PASSWORD });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Wrong email/password");

    response = await request(app)
        .post("/login")
        .send({ email: sharedUser.email, password: "hoooooooooooo" });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Wrong email/password");

    response = await request(app)
        .post("/login")
        .send({ email: sharedUser.email, password: sharedUser.password });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body.message).toBe("Login/Password ok");
});

test("Test list users", async() => {
    let response = await request(app).get("/api/users");
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Token missing");

    response = await request(app)
        .get("/api/users")
        .set("x-access-token", "invalid.token.sorry");
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Token invalid");

    response = await request(app)
        .get("/api/users")
        .set("x-access-token", TOKEN_UNKNOW_USER);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");

    response = await request(app)
        .get("/api/users")
        .set("x-access-token", sharedUser.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Returning users");
});

test("user can delete own account but not another user", async() => {
    const self = await createTestUser("self-one", createdEmails, {
        name: "Self One",
    });
    const other = await createTestUser("self-two", createdEmails, {
        name: "Self Two",
    });

    // Les deux existent avant de commencer
    expect(await findUserById(self.id)).not.toBeNull();
    expect(await findUserById(other.id)).not.toBeNull();

    // Supprimer un autre user : refusé, et il existe toujours en base
    let response = await request(app)
        .delete(`/api/users/${other.id}`)
        .set("x-access-token", self.token);
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");
    expect(await findUserById(other.id)).not.toBeNull();

    // Supprimer son propre compte : 200, et il a disparu de la base
    response = await request(app)
        .delete(`/api/users/${self.id}`)
        .set("x-access-token", self.token);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("User deleted");
    expect(await findUserById(self.id)).toBeNull();
    // L'autre user n'a pas été touché
    expect(await findUserById(other.id)).not.toBeNull();

    // L'autre user peut supprimer son propre compte
    response = await request(app)
        .delete(`/api/users/${other.id}`)
        .set("x-access-token", other.token);
    expect(response.statusCode).toBe(200);
    expect(await findUserById(other.id)).toBeNull();
});

test("Test update password", async() => {
    // User dédié : on modifie son mot de passe sans impacter les autres tests
    const user = await createTestUser("password", createdEmails);
    const newPassword = "myNewPassword&1234";

    let response = await request(app)
        .put("/api/password")
        .send({ password: "myNewPassword123" });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Token missing");

    response = await request(app)
        .put("/api/password")
        .set("x-access-token", "invalid.token.sorry")
        .send({ password: "myNewPassword123" });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Token invalid");

    response = await request(app)
        .put("/api/password")
        .set("x-access-token", TOKEN_UNKNOW_USER)
        .send({ password: "myNewPassword123$" });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");

    response = await request(app)
        .put("/api/password")
        .set("x-access-token", user.token);
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
        "User not connected or password not provided",
    );

    response = await request(app)
        .put("/api/password")
        .set("x-access-token", user.token)
        .send({ password: "myNewPassword" });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Weak password!");

    // Après tous ces échecs, l'ancien mot de passe fonctionne toujours
    response = await request(app)
        .post("/login")
        .send({ email: user.email, password: user.password });
    expect(response.statusCode).toBe(200);

    // Changement valide
    response = await request(app)
        .put("/api/password")
        .set("x-access-token", user.token)
        .send({ password: newPassword });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Password updated");

    // Vérification réelle : l'ancien mot de passe est rejeté, le nouveau accepté
    response = await request(app)
        .post("/login")
        .send({ email: user.email, password: user.password });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Wrong email/password");

    response = await request(app)
        .post("/login")
        .send({ email: user.email, password: newPassword });
    expect(response.statusCode).toBe(200);
});
