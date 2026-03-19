const express = require('express')
const router = express.Router()
const user = require('../controllers/user.js')

router.post('/login', user.login)
router.post('/register', user.newUser)

module.exports = router;
