// Load Enviroment Variables to process.env (if not present take variables defined in .env file)
require('mandatoryenv').load(['DB_NAME', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD'])
const {
	DB_NAME,
	DB_HOST,
	DB_PORT,
	DB_USER,
	DB_PASSWORD,
	DB_LOG
} = process.env

const Sequelize = require('sequelize')
const isDbLoggingEnabled = ['1', 'true', 'yes', 'on'].includes(String(DB_LOG || '').toLowerCase())
const commonOptions = {
	dialect: 'postgres',
	logging: isDbLoggingEnabled ? console.log : false,
	dialectOptions: process.env.DB_SSL === 'true'
		? { ssl: { require: true, rejectUnauthorized: false } }
		: {}
}

const db = process.env.DATABASE_URL
	? new Sequelize(process.env.DATABASE_URL, commonOptions)
	: new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, { ...commonOptions, host: DB_HOST || 'localhost', port: DB_PORT || 5432 })
module.exports = db
