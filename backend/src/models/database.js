// Load Enviroment Variables to process.env (if not present take variables defined in .env file)
require('mandatoryenv').load(['DB'])
const { DB } = process.env

const Sequelize = require('sequelize')
const isDbLoggingEnabled = ['1', 'true', 'yes', 'on'].includes(String(process.env.DB_LOG || '').toLowerCase())
const sqliteConfig = {
	dialect: 'sqlite',
	storage: DB,
	// Disable noisy SQL logs by default, enable them with DB_LOG=true when needed.
	logging: isDbLoggingEnabled ? console.log : false
}
const config = DB.includes('sqlite') ? sqliteConfig : DB
const db = new Sequelize(config)
module.exports = db
