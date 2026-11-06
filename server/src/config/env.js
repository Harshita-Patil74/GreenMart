const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  deliveryCharge: Number(process.env.DELIVERY_CHARGE || 30),
  emailEnabled: String(process.env.EMAIL_ENABLED || "").toLowerCase() === "true",
  resendApiKey: process.env.RESEND_API_KEY,
  newsletterFromEmail: process.env.NEWSLETTER_FROM_EMAIL,
  newsletterFromName: process.env.NEWSLETTER_FROM_NAME || "GreenMart",
  newsletterReplyTo: process.env.NEWSLETTER_REPLY_TO,
  newsletterUnsubscribeSecret: process.env.NEWSLETTER_UNSUBSCRIBE_SECRET,
  newsletterEmailMode: process.env.NEWSLETTER_EMAIL_MODE || "mock",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM,
  adminEmail: process.env.ADMIN_EMAIL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
};
module.exports = env;
