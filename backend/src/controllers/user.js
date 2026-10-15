const status = require("http-status");
const userModel = require("../models/users.js");
const { ValidationError, AppError } = require("../util/AppError.js");
const bcrypt = require("bcrypt");
const jws = require("jws");
const { TOKENSECRET } = require("../../config/env");

function validPassword(password) {
    return /^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*])[\w!@#$%^&*]{8,}$/.test(
        password,
    );
}

// verify that user is the admin.
async function verifyAdmin(req, res, next) {
    const user = await userModel.findOne({ where: { email: req.login } });

    if (!user || !user.isAdmin) {
        throw new AppError("Forbidden", status.FORBIDDEN);
    }
    next();
}

// verify that req.login is a user in the db
async function isUserExist(req, res, next) {
    const user = await userModel.findOne({ where: { email: req.login } });
    if (!user) {
        throw new AppError("Forbidden", status.FORBIDDEN);
    }
    req.user = user;
    next();
}

module.exports = {
    async login(req, res) {
        // #swagger.tags = ['Users']
        // #swagger.summary = 'Verify credentials of user using email and password and return token'
        // #swagger.parameters['obj'] = { in: 'body', schema: { $email: 'John.Doe@acme.com', $password: '12345'}}
        if (
            !req.body ||
            !["email", "password"].every((k) => Object.hasOwn(req.body, k))
        )
            throw new ValidationError(
                "You must specify the email and password",
            );
        const { email, password } = req.body;
        const user = await userModel.findOne({ where: { email } });
        console.log(user);
        if (user) {
            if (await bcrypt.compare(password, user.passhash)) {
                const token = jws.sign({
                    header: { alg: "HS256" },
                    payload: email,
                    secret: TOKENSECRET,
                });
                res.json({
                    status: "success",
                    message: "Login/Password ok",
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        isAdmin: user.isAdmin,
                    },
                });
                return;
            }
        }
        throw new AppError("Wrong email/password", status.FORBIDDEN);
    },
    async newUser(req, res) {
        // #swagger.tags = ['Users']
        // #swagger.summary = 'New User'
        // #swagger.parameters['obj'] = { in: 'body', description:'Name and email', schema: { $name: 'John Doe', $email: 'John.Doe@acme.com', $password: '1m02P@SsF0rt!'}}
        if (
            !req.body ||
            !["name", "email", "password"].every((k) =>
                Object.hasOwn(req.body, k),
            )
        )
            throw new ValidationError("You must specify the name and email");
        const { name, email, password } = req.body;
        // console.log(req.body);
        if (!validPassword(password))
            throw new ValidationError("Weak password!");

        try {
            await userModel.create({
                name,
                email,
                passhash: await bcrypt.hash(password, 2),
            });
        } catch (e) {
            console.error(e);
            throw new AppError("Insertion error", status.BAD_REQUEST);
        }
        res.json({ status: "success", message: "User Added" });
    },
    async getUsers(req, res) {
        // #swagger.tags = ['Users']
        // #swagger.summary = 'Get All users'
        const users = await userModel.findAll({
            attributes: ["id", "name", "email"],
        });
        res.json({ status: "success", message: "Returning users", users });
    },
    async updateUser(req, res) {
        // TODO : verify if the token is valid and correspond to an admin
        // #swagger.tags = ['Users']
        // #swagger.summary = 'Mettre à jour les informations de l utilisateur (réservé à un utilisateur administrateur)'
        // #swagger.parameters['obj'] = { in: 'body', schema: { $name: 'John Doe', $email: 'John.Doe@acme.com', $password: '1m02P@SsF0rt!' }}
        const userModified = {};
        const body = req.body ?? {};
        for (const field of ["name", "email", "password"]) {
            if (Object.hasOwn(body, field)) {
                if (field === "password") {
                    userModified.passhash = await bcrypt.hash(body.password, 2);
                } else {
                    userModified[field] = body[field];
                }
            }
        }
        if (Object.keys(userModified).length === 0)
            throw new ValidationError(
                "You must specify the name, email or password",
            );
        await userModel.update(userModified, { where: { id: req.params.id } });
        res.json({ status: "success", message: "User updated" });
    },
    async deleteUser(req, res) {
        // #swagger.tags = ['Users']
        // #swagger.summary = 'Delete own account, or any user if requester is admin'
        if (!Object.hasOwn(req.params, "id"))
            throw new ValidationError("You must specify the id");
        const targetId = Number(req.params.id);
        if (!Number.isInteger(targetId))
            throw new ValidationError("You must specify the id");
        if (!req.user.isAdmin && req.user.id !== targetId) {
            throw new AppError("Forbidden", status.FORBIDDEN);
        }
        await userModel.destroy({ where: { id: targetId } });
        res.json({ status: "success", message: "User deleted" });
    },
    async updatePassword(req, res) {
        // #swagger.tags = ['Users']
        // #swagger.summary = 'update password of the currrently logged-in user'
        // #swagger.parameters['obj'] = { in: 'body', schema: { $password: 'myNewPassword123' }}
        if (!req.body || !Object.hasOwn(req.body, "password") || !req.login)
            throw new ValidationError(
                "User not connected or password not provided",
            );
        const { password } = req.body;
        console.log(validPassword(password));
        if (!validPassword(password))
            throw new ValidationError("Weak password!");
        const newPasswordHash = await bcrypt.hash(password, 2);
        await userModel.update(
            { passhash: newPasswordHash },
            { where: { email: req.login } },
        );
        res.json({ status: "success", message: "Password updated" });
    },
    verifyAdmin,
    isUserExist,
};
