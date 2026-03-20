const Sequelize = require('sequelize');
const db = require('./database.js');
const users = require('./users.js');
const groups = db.define('groups', {
    id:{
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
    },
    name: {
        type: Sequelize.STRING(128),
        validate:{
            is: /^[\da-zA-Z\-'\s]{1,128}$/i
        }
    }
}, { timestamps: false });


module.exports = groups;