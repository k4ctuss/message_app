'use strict'

const bcrypt = require('bcrypt')

module.exports = {
  async up (queryInterface) {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      const passhash = await bcrypt.hash('123456', 2)
      const now = new Date()

      await queryInterface.bulkInsert('users', [{
        name: 'nolan blanc',
        email: 'nolan.blanc@grenoble-inp.org',
        passhash,
        isAdmin: true
      }], { transaction })

      const [users] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = :email',
        {
          replacements: { email: 'nolan.blanc@grenoble-inp.org' },
          transaction
        }
      )
      const nolanId = users[0].id

      await queryInterface.bulkInsert('groups', [{
        name: 'superGroup',
        owner: nolanId
      }], { transaction })

      const [groups] = await queryInterface.sequelize.query(
        'SELECT id FROM groups WHERE name = :name',
        {
          replacements: { name: 'superGroup' },
          transaction
        }
      )
      const groupId = groups[0].id

      await queryInterface.bulkInsert('isMember', [{
        userId: nolanId,
        groupId: groupId,
        createdAt: now,
        updatedAt: now
      }], { transaction })

      await queryInterface.bulkInsert('messages', [{
        content: 'helloWorld',
        groupId,
        userId: nolanId,
        createdAt: now,
        updatedAt: now
      }], { transaction })

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  },

  async down (queryInterface) {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      const [users] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = :email',
        {
          replacements: { email: 'nolan.blanc@grenoble-inp.org' },
          transaction
        }
      )
      const nolanId = users[0]?.id

      const [groups] = await queryInterface.sequelize.query(
        'SELECT id FROM groups WHERE name = :name',
        {
          replacements: { name: 'superGroup' },
          transaction
        }
      )
      const groupId = groups[0]?.id

      if (groupId) {
        await queryInterface.bulkDelete('messages', { groupId }, { transaction })
        await queryInterface.bulkDelete('isMember', { groupId }, { transaction })
        await queryInterface.bulkDelete('groups', { id: groupId }, { transaction })
      }

      if (nolanId) {
        await queryInterface.bulkDelete('users', { id: nolanId }, { transaction })
      }

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }
}
