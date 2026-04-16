const jws = require('jws');
const CodeError = require('../util/CodeError');

const usersModel = require('../models/users');
const messagesModel = require('../models/messages');
const groupsModel = require('../models/groups');

const { TOKENSECRET } = process.env;

function verifyToken(token) {
  if (!token) {
    throw new CodeError('Token missing', 403);
  }
  
  if (!jws.verify(token, 'HS256', TOKENSECRET)) {
    throw new CodeError('Token invalid', 403);
  }

  return jws.decode(token).payload;
}

function initWebSocket(io){
    io.use((socket, next)=>{
        try{
            const token = socket.handshake.auth.token;
            const payload = verifyToken(token);
            
            // Ajouter l'user aux données du socket
            socket.data.login = payload;
            
            next();
        }catch(err){
            next(new Error(err.message || 'Authentication failed'));
        }
    });
    
    io.on('connection', (socket)=>{
        console.log(`User ${socket.data.login} connected`);
        
        socket.on('joinDiscussion', (gid)=>{
            socket.join(`discussion_${gid}`);
            console.log(`User ${socket.data.login} joined discussion ${gid}`);
        });
    
        socket.on('leaveDiscussion', (gid)=>{
            socket.leave(`discussion_${gid}`);
            console.log(`User ${socket.data.login} left discussion ${gid}`);
        });
    
        socket.on('disconnect', () => {
            console.log(`User ${socket.data.login} disconnected`);
        });

        // ------- discussion ---------- //
        socket.on('newMessage', async(data, callback)=>{
            const {gid, content} = data;
            console.log("new message: "+content)
            
            // check user
            const user = await usersModel.findOne({ where: { email: socket.data.login }})
            if(!user) return callback({status:"NOK", message:"Access Forbidden"});

            // check group
            const group = await groupsModel.findByPk(gid);
            if(!group) return callback({status:"NOK", message:"Group does not exist"});
            if(!await group.hasMember(user)) return callback({status:"NOK", message:"You are not part of the group!"});

            //check content
            if(!content || content.trim() === "") return callback({status:"NOK", message:"Empty or invalid message"});
            //create message
            try{
                const createdMessage = await messagesModel.create({content:content.trim(), userId:user.id, groupId:group.id});
                const message = await messagesModel.findByPk(createdMessage.id, {
                    include: [
                        {
                            model: usersModel,
                            as: 'user',
                            attributes: ['id', 'name']
                        },
                    ],
                });
                console.log("created message", message);
                callback({status:"OK"});
                io.to(`discussion_${gid}`).emit('receivedMessage', message);
            }catch(e){
                callback({status:"NOK", message:"Error on message creation"});
            }
        });
    });
}

module.exports = {initWebSocket}