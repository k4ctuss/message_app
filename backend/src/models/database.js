const Sequelize = require("sequelize");
const env = require("../../config/env");
const config = require("../../config/config.js")[env.NODE_ENV];

const db = config.use_env_variable
    ? new Sequelize(env.DATABASE_URL, config)
    : new Sequelize(config.database, config.username, config.password, config);

module.exports = db;
