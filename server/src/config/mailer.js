const nodemailer = require("nodemailer");
const env = require("./env");

function getSmtpStatus(config = env) {
  const missing = [];
  if (!String(config.smtpHost || "").trim()) missing.push("SMTP_HOST");
  if (!Number.isInteger(config.smtpPort) || config.smtpPort < 1 || config.smtpPort > 65535) missing.push("SMTP_PORT");
  if (!String(config.smtpUser || "").trim()) missing.push("SMTP_USER");
  if (!String(config.smtpPass || "").trim()) missing.push("SMTP_PASS");
  if (!String(config.emailFrom || "").trim()) missing.push("EMAIL_FROM");
  return {
    configured: missing.length === 0,
    missing,
    message: missing.length ? `SMTP is not configured. Set ${missing.join(", ")}.` : undefined,
  };
}

function createMailer({ config = env, createTransport = nodemailer.createTransport } = {}) {
  let transporter;

  async function sendMail({ to, subject, html }) {
    if (!config.emailEnabled) {
      const error = new Error("Email functionality is currently unavailable.");
      error.code = "EMAIL_DISABLED";
      throw error;
    }
    const status = getSmtpStatus(config);
    if (!status.configured) {
      const error = new Error(status.message);
      error.code = "SMTP_NOT_CONFIGURED";
      throw error;
    }

    try {
      transporter ||= createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: { user: config.smtpUser, pass: config.smtpPass },
      });
      return await transporter.sendMail({ from: config.emailFrom, to, subject, html });
    } catch (cause) {
      console.error("Email delivery failed:", cause?.code || "SMTP_ERROR");
      const error = new Error("Email delivery failed.");
      error.code = "EMAIL_DELIVERY_FAILED";
      throw error;
    }
  }

  return { sendMail };
}

const mailer = createMailer();

module.exports = { sendMail: mailer.sendMail, createMailer, getSmtpStatus };
