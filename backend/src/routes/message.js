const express = require('express');
const router = express.Router();
const groupCtr = require('../controllers/group');
const messageCtr = require('../controllers/message');
const userCtr = require('../controllers/user');


router.get('/messages/:gid', userCtr.isUserExist, groupCtr.loadGroup, messageCtr.verifMembership, messageCtr.getMessages);
router.post('/messages/:gid', userCtr.isUserExist, groupCtr.loadGroup, messageCtr.verifMembership, messageCtr.newMessage);

module.exports = router;