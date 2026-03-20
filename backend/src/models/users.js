const Sequelize = require('sequelize')
const db = require('./database.js')
const groups = require('./groups.js');
const users = db.define('users', {
  id: {
    primaryKey: true,
    type: Sequelize.INTEGER,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING(128),
    validate: {
      is: /^[a-z\-'\s]{1,128}$/i
    }
  },
  email: {
    type: Sequelize.STRING(128),
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passhash: {
    type: Sequelize.STRING(60),
    validate: {
      is: /^[0-9a-z\\/$.]{60}$/i
    }
  }, 
  isAdmin:{
    type: Sequelize.BOOLEAN,
    default:false
  }
}, { timestamps: false })

// association create/own.    user 1-----n group
users.hasMany(groups, {foreignKey: 'owner', as:'createOrOwn'});
groups.belongsTo(users, {foreignKey: 'owner', as:'createOrOwn'});

users.addHook('beforeDestroy', async(user, options)=>{
  const admin = await users.findOne({where:{isAdmin:true}});
  const transaction = options.transaction;

  await groups.update(
    {owner:admin?.id ?? null},
    {
      where:{owner:user.id},
      transaction
    }
  );
});

// association isMember    user n-----n group
users.belongsToMany(groups, {through: 'isMember', as: 'groups'});
groups.belongsToMany(users, {through: 'isMember', as: 'members'});
module.exports = users
