const userModel = require('../models/users.js')
const groupModel = require('../models/groups.js')
const messageModel = require('../models/messages.js')
const bcrypt = require('bcrypt');
// Ajouter ici les nouveaux require des nouveaux modèles

// eslint-disable-next-line no-unexpected-multiline
(async () => {
  // Regénère la base de données
  await require('../models/database.js').sync({ force: true })
  console.log('Base de données créée.')
  // Initialise la base avec quelques données
  const passhash = await bcrypt.hash('123456', 2);
  const nolan = await userModel.create({
    name: 'nolan blanc', email: 'nolan.blanc@grenoble-inp.org', passhash, isAdmin:true
  })
  
  // Ajouter ici le code permettant d'initialiser par défaut la base de donnée
  const myGroup = await groupModel.create({ name: 'superGroup'});
  await myGroup.setCreateOrOwn(nolan);

  await myGroup.addMember(nolan);
  const helloWorld = await messageModel.create({content:"helloWorld"});
  await myGroup.addMessage(helloWorld);
  await helloWorld.setGroup(myGroup);
  await helloWorld.setUser(nolan);
  await nolan.addMessage(helloWorld);

})()
