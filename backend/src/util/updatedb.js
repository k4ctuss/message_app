const userModel = require('../models/users.js')
const groupModel = require('../models/groups.js')
const messageModel = require('../models/messages.js')
const bcrypt = require('bcrypt');
// Ajouter ici les nouveaux require des nouveaux modèles

const database = require('../models/database.js')
const resetDatabase = process.env.DB_RESET === 'true'
const seedDatabase = process.env.DB_SEED === 'true'

async function seed () {
  const passhash = await bcrypt.hash('123456', 2)
  const [nolan] = await userModel.findOrCreate({
    where: { email: 'nolan.blanc@grenoble-inp.org' },
    defaults: {
      name: 'nolan blanc',
      passhash,
      isAdmin: true
    }
  })

  const [myGroup, groupCreated] = await groupModel.findOrCreate({
    where: { name: 'superGroup' }
  })
  await myGroup.setCreateOrOwn(nolan)
  await myGroup.addMember(nolan)

  if (!groupCreated) {
    return
  }

  const helloWorld = await messageModel.create({ content: 'helloWorld' })
  await myGroup.addMessage(helloWorld)
  await helloWorld.setGroup(myGroup)
  await helloWorld.setUser(nolan)
  await nolan.addMessage(helloWorld)
}

async function updateDatabase () {
  if (resetDatabase && process.env.NODE_ENV === 'production') {
    throw new Error('DB_RESET=true is forbidden in production')
  }

  await database.sync({ force: resetDatabase })

  if (seedDatabase) {
    await seed()
  }
}

updateDatabase()
  .then(() => database.close())
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
