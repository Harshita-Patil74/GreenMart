const env = require("../src/config/env");
if (process.env.NODE_ENV === "test") {
  env.smtpHost = undefined;
  env.smtpUser = undefined;
  env.smtpPass = undefined;
  env.emailFrom = undefined;
  env.geminiApiKey = undefined;
}

const app = require("../src/app");

module.exports = { app };
