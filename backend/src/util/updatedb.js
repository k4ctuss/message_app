const database = require("../models/database.js");
const { execSync } = require("child_process");
const env = require("../../config/env");

async function updateDatabase() {
    const isResetAllowed =
        (env.isTest || env.isDevelopment) && !env.DATABASE_URL;

    if (env.DB_RESET) {
        if (!isResetAllowed) {
            throw new Error(
                `DB reset refused: NODE_ENV="${env.NODE_ENV}" does not allow reset or DATABASE_URL is set`,
            );
        }
        execSync("npx sequelize-cli db:seed:undo:all", { stdio: "inherit" });
        execSync("npx sequelize-cli db:migrate:undo:all", { stdio: "inherit" });
    }

    execSync("npx sequelize-cli db:migrate", { stdio: "inherit" });

    if (env.DB_SEED) {
        execSync("npx sequelize-cli db:seed:all", { stdio: "inherit" });
    }
}

updateDatabase()
    .then(() => database.close())
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
