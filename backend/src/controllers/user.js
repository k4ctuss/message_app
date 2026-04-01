const status = require('http-status')
const userModel = require('../models/users.js')
const has = require('has-keys')
const CodeError = require('../util/CodeError.js')
const bcrypt = require('bcrypt')
const jws = require('jws')
require('mandatoryenv').load(['TOKENSECRET'])
const { TOKENSECRET } = process.env

function validPassword (password) {
  return /^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*])[\w!@#$%^&*]{8,}$/.test(password)
}

// verify that user is the admin.
async function verifyAdmin(req, res, next){

    const user = await userModel.findOne({ where: { email: req.login }})

    if(!user || !user.isAdmin){
        throw new CodeError('Forbidden', status.FORBIDDEN);
    }
    next();
}

// verify that req.login is a user in the db
async function isUserExist(req, res, next){
    const user = await userModel.findOne({ where: { email: req.login }})
    if(!user){
        throw new CodeError('Forbidden', status.FORBIDDEN);
    }
    req.user = user;
    next();
}

module.exports = {
  async login (req, res) {
    // #swagger.tags = ['Users']
    // #swagger.summary = 'Verify credentials of user using email and password and return token'
    // #swagger.parameters['obj'] = { in: 'body', schema: { $email: 'John.Doe@acme.com', $password: '12345'}}
    if (!has(req.body, ['email', 'password'])) throw new CodeError('You must specify the email and password', status.BAD_REQUEST)
    const { email, password } = req.body
    const user = await userModel.findOne({ where: { email } })
    console.log(user);
    if (user) {
      if (await bcrypt.compare(password, user.passhash)) {
        const token = jws.sign({ header: { alg: 'HS256' }, payload: email, secret: TOKENSECRET })
        res.json({ status: true, message: 'Login/Password ok', token, user:{id:user.id, name:user.name, email:user.email, isAdmin:user.isAdmin}});
        return
      }
    }
    res.status(status.FORBIDDEN).json({ status: false, message: 'Wrong email/password' })
  },
  async newUser (req, res) {
    // #swagger.tags = ['Users']
    // #swagger.summary = 'New User'
    // #swagger.parameters['obj'] = { in: 'body', description:'Name and email', schema: { $name: 'John Doe', $email: 'John.Doe@acme.com', $password: '1m02P@SsF0rt!'}}
    if (!has(req.body, ['name', 'email', 'password'])) throw new CodeError('You must specify the name and email', status.BAD_REQUEST)
    const { name, email, password } = req.body
    console.log(req.body)
    if (!validPassword(password)) throw new CodeError('Weak password!', status.BAD_REQUEST)
    await userModel.create({ name, email, passhash: await bcrypt.hash(password, 2) })
    res.json({ status: true, message: 'User Added' })
  },
  async getUsers (req, res) {
    // #swagger.tags = ['Users']
    // #swagger.summary = 'Get All users'
    const users = await userModel.findAll({ attributes: ['id', 'name', 'email'] })
    res.json({ status: true, message: 'Returning users', users })
  },
  async updateUser (req, res) {
    // TODO : verify if the token is valid and correspond to an admin
    // #swagger.tags = ['Users']
    // #swagger.summary = 'Mettre à jour les informations de l utilisateur (réservé à un utilisateur administrateur)'
    // #swagger.parameters['obj'] = { in: 'body', schema: { $name: 'John Doe', $email: 'John.Doe@acme.com', $password: '1m02P@SsF0rt!' }}
    const userModified = {}
    for (const field of ['name', 'email', 'password']) {
      if (has(req.body, field)) {
        if (field === 'password') {
          userModified.passhash = await bcrypt.hash(req.body.password, 2)
        } else {
          userModified[field] = req.body[field]
        }
      }
    }
    if (Object.keys(userModified).length === 0) throw new CodeError('You must specify the name, email or password', status.BAD_REQUEST)
    await userModel.update(userModified, { where: { id: req.params.id } })
    res.json({ status: true, message: 'User updated' })
  },
  async deleteUser (req, res) {
    // TODO : verify if the token is valid and correspond to an admin
    // #swagger.tags = ['Users']
    // #swagger.summary = 'Delete User'
    if (!has(req.params, 'id')) throw new CodeError('You must specify the id', status.BAD_REQUEST)
    const { id } = req.params
    await userModel.destroy({ where: { id } })
    res.json({ status: true, message: 'User deleted' })
  },
  async updatePassword(req, res){
    // #swagger.tags = ['Users']
    // #swagger.summary = 'update password of the currrently logged-in user'
    // #swagger.parameters['obj'] = { in: 'body', schema: { $password: 'myNewPassword123' }}
    if(!has(req.body, ['password']) || !req.login) throw new CodeError('User not connected or password not provided', status.BAD_REQUEST);
    const {password} = req.body;
    console.log(validPassword(password));
    if(!validPassword(password)) throw new CodeError('Weak password!', status.BAD_REQUEST);
    const newPasswordHash = await bcrypt.hash(password, 2);
    await userModel.update({passhash:newPasswordHash}, { where: { email: req.login } })
    res.json({ status: true, message: 'Password updated' })

  },
  verifyAdmin,
  isUserExist
}
