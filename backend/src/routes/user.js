const express = require('express')
const router = express.Router()
const user = require('../controllers/user.js')

router.get('/users', user.getUsers)
router.post('/users', user.newUser)
router.put('/users/:id', user.updateUser)
router.delete('/users/:id', user.deleteUser)
router.post('/login', user.login)

module.exports = router
