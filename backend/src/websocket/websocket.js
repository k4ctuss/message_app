const jws = require('jws');
const CodeError = require('../util/CodeError');

const usersModel = require('../models/users');
const messagesModel = require('../models/messages');
const groupsModel = require('../models/groups');

const { TOKENSECRET } = process.env;

// utils functions
function verifyToken(token) {
  if (!token) {
    throw new CodeError('Token missing', 403);
  }

  if (!jws.verify(token, 'HS256', TOKENSECRET)) {
    throw new CodeError('Token invalid', 403);
  }

  return jws.decode(token).payload;
}

// check if socket's user Exist
async function isUserExist(id) {
  return !!await usersModel.findByPk(id);
}

// return group based on group id
async function loadGroup(gid) {
  return await groupsModel.findByPk(gid);
}

// set up the web socket
function initWebSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const payload = verifyToken(token);

      // Ajouter l'user aux données du socket
      socket.data.login = payload;

      next();
    } catch (err) {
      next(new Error(err.message || 'Authentication failed'));
    }
  });

  io.on('connection', async(socket) => {
    // DEBUGING
    socket.onAnyOutgoing((eventName, ...args) => {
      console.log(`[#${socket.id}] [OUT]`, eventName, ...args);
    });
    socket.onAny((eventName, ...args) => {
      console.log(`[#${socket.id}] [IN]`, eventName, ...args);
    });

    /// / LOGIG
    console.log(`User ${socket.data.login} connected`);
    socket.data.user = await usersModel.findOne({ where: { email: socket.data.login }, attributes: ['id', 'name', 'isAdmin'] });
    socket.join(socket.data.user.id);

    // add to admin if need
    if (socket.data.user.isAdmin) {
      socket.join('adminMember');
      console.log(`User ${socket.data.login} is Admin`);
    }

    socket.on('joinDiscussion', async(gid, callback) => {
      const user = socket.data.user;
      const group = await loadGroup(gid);

      if (!user || !group || !await group.hasMember(user)) {
        if (typeof callback === 'function') {
          callback({ status: 'NOK', message: 'Forbidden' });
        }
        return;
      }

      socket.join(`discussion_${gid}`);
      console.log(`User ${socket.data.login} joined discussion ${gid}`);
      if (typeof callback === 'function') {
        callback({ status: 'OK' });
      }
    });

    socket.on('leaveDiscussion', (gid) => {
      socket.leave(`discussion_${gid}`);
      console.log(`User ${socket.data.login} left discussion ${gid}`);
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.data.login} disconnected`);
    });

    // ------- discussion ---------- //
    socket.on('newMessage', async(data, callback) => {
      const { gid, content } = data;
      console.log('new message: ' + content);

      // check user
      const user = await usersModel.findOne({ where: { email: socket.data.login } });
      if (!user) return callback({ status: 'NOK', message: 'Access Forbidden' });

      // check group
      const group = await groupsModel.findByPk(gid);
      if (!group) return callback({ status: 'NOK', message: 'Group does not exist' });
      if (!await group.hasMember(user)) return callback({ status: 'NOK', message: 'You are not part of the group!' });

      // check content
      if (!content || content.trim() === '') return callback({ status: 'NOK', message: 'Empty or invalid message' });
      // create message
      try {
        const createdMessage = await messagesModel.create({ content: content.trim(), userId: user.id, groupId: group.id });
        const message = await messagesModel.findByPk(createdMessage.id, {
          include: [
            {
              model: usersModel,
              as: 'user',
              attributes: ['id', 'name']
            }
          ]
        });
        console.log('created message', message);
        callback({ status: 'OK' });
        io.to(`discussion_${gid}`).emit('receivedMessage', message);
      } catch (e) {
				console.log("Error on message creation", e);
        callback({ status: 'NOK', message: 'Error on message creation' });
      }
    });

    // ------- groups ---------- //
    // ajout d'un membre
    socket.on('addMember', async(data, callback) => {
      if (!await isUserExist(socket.data.user.id)) {
        return callback({ status: 'NOK', message: 'Access Forbidden' });
      }
      const { gid, uid } = data;
      // load the group;
      const group = await loadGroup(gid);
      if (!group) return callback({ status: 'NOK', message: 'Group not found' });
      // check uid
      if (!uid) return callback({ status: 'NOK', message: 'User id not provided' });

      const newMember = await usersModel.findByPk(uid);
      if (!newMember) return callback({ status: 'NOK', message: 'User id invalid' });
      const owner = await group.getCreateOrOwn({ attributes: ['id'] });
      if (!socket.data.user.isAdmin && owner.id !== socket.data.user.id) return callback({ status: 'NOK', message: 'Forbidden' });
      await group.addMember(newMember);

      // send group to the new member
      io.to(newMember.id).emit('addedToGroup_member', group);

      callback({ status: 'OK', message: 'member added' });
    });

    // suppression d'un membre
    socket.on('deleteMember', async(data, callback) => {
      if (!await isUserExist(socket.data.user.id)) {
        return callback({ status: 'NOK', message: 'Access Forbidden' });
      }
      const { gid, uid } = data;
      // load the group;
      const group = await loadGroup(gid);
      if (!group) return callback({ status: 'NOK', message: 'Group not found' });
      // check uid
      if (!uid) return callback({ status: 'NOK', message: 'User id not provided' });
      const member = await usersModel.findByPk(uid);
      if (!member) return callback({ status: 'NOK', message: 'User id invalid' });

      const owner = await group.getCreateOrOwn({ attributes: ['id'] });
      const members = await group.getMembers({ attributes: ['id'] });
      const { user } = socket.data;
      if (!(user.isAdmin || owner.id === user.id || uid == user.id && members.some(m => m.id === user.id))) return callback({ status: 'NOK', message: 'Forbidden' });
      await group.removeMember(uid);

      // Ensure all active sockets for this user leave the discussion room immediately.
      io.in(String(member.id)).socketsLeave(`discussion_${gid}`);

      // ask member to remove group from its list
      io.to(member.id).emit('deleteGroup_member', group);

      callback({ status: 'OK', message: 'member deleted' });
    });
  });
}

module.exports = { initWebSocket };
