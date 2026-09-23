const express = require('express');
const router = express.Router();
const group = require('../controllers/group.js');
const user = require('../controllers/user.js');

router.get('/mygroups', user.isUserExist, group.getGroups);
router.post('/mygroups', user.isUserExist, group.newGroup);
router.get('/mygroups/:gid', user.isUserExist, group.loadGroup, group.getMembers);
router.delete('/mygroups/:gid', user.isUserExist, group.loadGroup, group.deleteGroup);
router.put('/mygroups/:gid/:uid', user.isUserExist, group.loadGroup, group.addMember);
router.delete('/mygroups/:gid/:uid', user.isUserExist, group.loadGroup, group.deleteMember);
router.get('/groupsmember', user.isUserExist, group.getJoinedGroups);

module.exports = router;
