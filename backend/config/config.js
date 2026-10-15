const env = require("./env");

const common = {
    dialect: "postgres",
    logging: env.DB_LOG ? console.log : false,
};

const sslOptions = env.DB_SSL
    ? {
          dialectOptions: {
              ssl: { require: true, rejectUnauthorized: false },
          },
      }
    : {};

const localConnection = env.db && {
    username: env.db.user,
    password: env.db.password,
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    ...common,
};

module.exports = {
    development: localConnection || { ...common },
    test: localConnection || { ...common },
    production: {
        use_env_variable: "DATABASE_URL",
        ...common,
        ...sslOptions,
    },
};
