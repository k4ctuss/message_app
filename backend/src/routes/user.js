const express = require('express');
const router = express.Router();
const user = require('../controllers/user.js');
const jws = require('jws')
const { TOKENSECRET } = process.env


// This middleware adds the json header to every response for the api
router.use('/', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  // cf. https://swagger-autogen.github.io/docs/swagger-2/authentication/api-keys-token/
  // #swagger.security = [{"apiKeyAuth": []}] 
  if (!req.headers || !req.headers.hasOwnProperty('x-access-token'))
    throw {code: 403, message: 'Token missing'}
  // Code vérifiant la validité du token 
  if (!jws.verify(req.headers['x-access-token'],'HS256',TOKENSECRET))
    throw {code: 403, message: 'Token invalid'}
  // Le payload du token contient le login de l'utilisateur
  // On modifie l'objet requête pour mettre le login à disposition pour les middleware suivants
  req.login=jws.decode(req.headers['x-access-token']).payload
  // On appelle la fonction middleware suivante :
  next()
})

router.get('/users', user.isUserExist, user.getUsers);
router.put('/password', user.isUserExist, user.updatePassword);
router.put('/users/:id', user.verifyAdmin, user.updateUser);
router.delete('/users/:id', user.verifyAdmin, user.deleteUser);

module.exports = router;
