const messagesModel = require("../models/messages");
const usersModel = require("../models/users");
const CodeError = require("../util/CodeError");

const status = require("http-status");
const has = require("has-keys");

async function verifMembership(req, res, next) {
    const { group, user } = req;
    if (!group || !user)
        throw new CodeError("group or user undefined", status.BAD_GATEWAY);
    if (!(await group.hasMember(user)))
        throw new CodeError("Forbidden", status.FORBIDDEN);
    next();
}

module.exports = {
    async getMessages(req, res) {
        // #swagger.tags = ['Messages']
        // #swagger.summary = "Get All messages of the group"
        const { group } = req;
        const messages = await group.getMessages({
            include: [
                { model: usersModel, as: "user", attributes: ["id", "name"] },
            ],
        });
        res.json({ status: true, message: "Return all messages", messages });
    },
    async newMessage(req, res) {
        // #swagger.tags = ['Messages']
        // #swagger.summary = "Create a message"
        // #swagger.parameters['obj'] = { in: 'body', schema: { $content: 'message content' }}
        if (!has(req.body, ["content"]))
            throw new CodeError(
                "message content not provided",
                status.BAD_REQUEST,
            );
        const { group, user } = req;
        try {
            await messagesModel.create({
                content: req.body.content,
                userId: user.id,
                groupId: group.id,
            });
        } catch (e) {
            console.error(e);
            throw new CodeError("insertion error", status.BAD_REQUEST);
        }
        res.json({ status: true, message: "message added" });
    },
    verifMembership,
};
