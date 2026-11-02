module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  testPathIgnorePatterns: ["<rootDir>/tests/mockcheck.test.js"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000,
};
