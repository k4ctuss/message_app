const Sequelize = require('sequelize');
const db = require('./database.js');
const messages = require('./messages.js');

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
        },
        unique:true
    }
}, { timestamps: false });

// association contains groups 1 --- n message
groups.hasMany(messages, {as: 'messages'});
messages.belongsTo(groups, {as: 'group'});


module.exports = groups;