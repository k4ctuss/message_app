const status = require("http-status");
const groupModel = require("../models/groups");
const userModel = require("../models/users");
const has = require("has-keys");
const CodeError = require("../util/CodeError");

async function loadGroup(req, res, next) {
    if (!has(req.params, ["gid"]))
        throw new CodeError(
            "you must specify the group id",
            status.BAD_REQUEST,
        );
    const { gid } = req.params;
    const group = await groupModel.findByPk(gid);
    if (!group) throw new CodeError("Group not found", status.NOT_FOUND);
    req.group = group;
    next();
}

module.exports = {
    async getGroups(req, res) {
        // #swagger.tags = ['Groups']
        // #swagger.summary = 'Get All group i own/create'
        const { user } = req;
        const where = {};
        if (!user.isAdmin) {
            where.owner = user.id;
        }
        const groups = await groupModel.findAll({ where });
        res.json({ status: true, message: "Returning my groups", groups });
    },
    async newGroup(req, res) {
        // #swagger.tags = ['Groups']
        // #swagger.summary = 'Create a new groupe'
        // #swagger.parameters['obj'] = { in: 'body', schema: { $name: 'myGroupName' }}
        if (!has(req.body, ["name"]))
            throw new CodeError("Group name not provided", status.BAD_REQUEST);
        const { name } = req.body;
        if (!name || name.trim() === "")
            throw new CodeError("Group name invalid", status.BAD_REQUEST);
        const { user } = req;
        try {
            const newGroup = await groupModel.create({ name: name.trim() });
            await newGroup.setCreateOrOwn(user);
        } catch (e) {
            const message =
                e.errors[0].message == "name must be unique"
                    ? "name already use"
                    : "insertion Error";
            throw new CodeError(message, status.BAD_REQUEST);
        }
        res.json({ status: true, message: "Group added" });
    },
    async getMembers(req, res) {
        // #swagger.tags = ['Groups']
        // #swagger.summary = 'Get All members of the group'
        const { user, group } = req;
        const owner = await group.getCreateOrOwn({ attributes: ["id"] });
        const members = await group.getMembers({
            attributes: ["id", "email", "name"],
        });
        if (!(
            user.isAdmin ||
            owner.id == user.id ||
            members.some((member) => member.id === user.id)
        )) {
            throw new CodeError("Forbidden", status.FORBIDDEN);
        }
        res.json({ status: true, message: "Returning all members", members });
    },
    async deleteGroup(req, res) {
        // #swagger.tags = ['Groups']
        // #swagger.summary = 'delete Group'
        const { user, group } = req;
        const owner = await group.getCreateOrOwn({ attributes: ["id"] });
        if (!user.isAdmin && owner.id != user.id) {
            throw new CodeError("Forbidden", status.FORBIDDEN);
        }
        await group.destroy();
        res.json({ status: true, message: "group deleted" });
    },
    async addMember(req, res) {
        // #swagger.tags = ['Groups']
        // #swagger.summary = 'Add an user to Group'
        if (!has(req.params, ["uid"]))
            throw new CodeError("User id not provided", status.BAD_REQUEST);
        const { uid } = req.params;
        const newMember = await userModel.findByPk(uid);
        if (!newMember)
            throw new CodeError("User id invalid", status.BAD_REQUEST);
        const { group, user } = req;
        const owner = await group.getCreateOrOwn({ attributes: ["id"] });

        if (!user.isAdmin && owner.id !== user.id)
            throw new CodeError("Forbidden", status.FORBIDDEN);

        await group.addMember(newMember);
        res.json({ status: true, message: "New member added" });
    },
    async deleteMember(req, res) {
        // #swagger.tags = ['Groups']
        // #swagger.summary = 'Delete an user from Group'
        if (!has(req.params, ["uid"]))
            throw new CodeError("User id not provided", status.BAD_REQUEST);
        const { uid } = req.params;
        const member = await userModel.findByPk(uid);
        if (!member) throw new CodeError("User id invalid", status.BAD_REQUEST);

        const { group, user } = req;
        const owner = await group.getCreateOrOwn({ attributes: ["id"] });
        const members = await group.getMembers({ attributes: ["id"] });

        if (!(
            user.isAdmin ||
            owner.id === user.id ||
            (uid == user.id && members.some((m) => m.id === user.id))
        ))
            throw new CodeError("Forbidden", status.FORBIDDEN);

        await group.removeMember(uid);
        res.json({ status: true, message: "Member deleted" });
    },
    async getJoinedGroups(req, res) {
        // #swagger.tags = ['Groups']
        // #swagger.summary = 'List the groups of which the user is a member'
        const { user } = req;
        const groups = await user.getGroups();
        res.json({
            status: true,
            message: "Returning all groups of which user is a member",
            groups,
        });
    },
    loadGroup,
};
