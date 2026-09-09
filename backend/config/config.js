require('dotenv').config()

const common = {
  dialect: 'postgres',
  logging: process.env.DB_LOG ? console.log : false,
}

function fromUrlOrParts (defaultDbName) {
  if (process.env.DATABASE_URL) {
    return { use_env_variable: 'DATABASE_URL', ...common }
  }
  return {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'test',
    database: process.env.DB_NAME || defaultDbName,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    ...common,
  }
}

module.exports = {
  development: fromUrlOrParts('messaging'),
  test: fromUrlOrParts('messaging_test'),
  production: {
    use_env_variable: 'DATABASE_URL',
    ...common,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  },
}