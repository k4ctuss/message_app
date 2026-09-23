const database = require('../models/database.js');
const { execSync } = require('child_process');

const resetDatabase = process.env.DB_RESET === 'true';
const seedDatabase = process.env.DB_SEED === 'true';

async function updateDatabase() {
  const isResetAllowed = ['test', 'development'].includes(process.env.NODE_ENV) && !process.env.DATABASE_URL;

  if (resetDatabase) {
    if (!isResetAllowed) {
      throw new Error(`DB reset refusé : NODE_ENV="${process.env.NODE_ENV}" n'autorise pas le reset`);
    }
    execSync('npx sequelize-cli db:seed:undo:all', { stdio: 'inherit' });
    execSync('npx sequelize-cli db:migrate:undo:all', { stdio: 'inherit' });
  }

  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });

  if (seedDatabase) {
    execSync('npx sequelize-cli db:seed:all', { stdio: 'inherit' });
  }
}

updateDatabase()
  .then(() => database.close())
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
