module.exports = {
	testEnvironment: "node",
	testMatch: ["**/*.test.js"],
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    collectCoverageFrom: ["src/**/*.js", "!src/**/*.test.js"],
};
