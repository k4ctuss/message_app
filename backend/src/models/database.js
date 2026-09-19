const Sequelize = require('sequelize')
const config = require('../../config/config.js')[process.env.NODE_ENV || 'development']

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquant en production — arrêt volontaire')
}

const db = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable], config)
  : new Sequelize(config.database, config.username, config.password, config)

module.exports = db