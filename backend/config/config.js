require("dotenv").config();

const common = {
    dialect: "postgres",
    logging: process.env.DB_LOG ? console.log : false,
};

const sslOptions =
    process.env.DB_SSL === "false"
        ? {}
        : {
              dialectOptions: {
                  ssl: { require: true, rejectUnauthorized: false },
              },
          };

const localConnection = {
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "test",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    ...common,
};

module.exports = {
    development: {
        ...localConnection,
        database: process.env.DB_NAME || "messaging",
    },
    test: {
        ...localConnection,
        database: "messaging_test",
    },
    production: {
        use_env_variable: "DATABASE_URL",
        ...common,
        ...sslOptions,
    },
};
