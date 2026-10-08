import { defineConfig } from "cypress";

export default defineConfig({
    allowCypressEnv: false,
    video: true,

    e2e: {
        baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:5173",
        defaultCommandTimeout: 10000,
        specPattern: "cypress/e2e/**/*.cy.js",
        env: {
            apiUrl:
                process.env.CYPRESS_API_URL ||
                process.env.VITE_API_URL ||
                "http://localhost:3000",
        },
        setupNodeEvents(on, config) {
            return config;
        },
    },
});
