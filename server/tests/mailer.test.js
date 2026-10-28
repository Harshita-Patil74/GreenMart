const { createMailer, getSmtpStatus } = require("../src/config/mailer");
const request = require("supertest");
const { app } = require("./setup");
const env = require("../src/config/env");

const validConfig = {
  emailEnabled: true,
  smtpHost: "smtp.example.test",
  smtpPort: 587,
  smtpUser: "mailer@example.test",
  smtpPass: "test-password",
  emailFrom: "GreenMart <mailer@example.test>",
};

describe("SMTP configuration and delivery", () => {
  it("reports required configuration variable names without values", () => {
    const status = getSmtpStatus({});

    expect(status.configured).toBe(false);
    expect(status.missing).toEqual(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"]);
    expect(status.message).not.toContain(validConfig.smtpPass);
  });

  it("does not create a transport or report success when SMTP is incomplete", async () => {
    const createTransport = jest.fn();
    const mailer = createMailer({ config: { emailEnabled: true }, createTransport });

    await expect(mailer.sendMail({ to: "recipient@example.test", subject: "Test", html: "Test" }))
      .rejects.toMatchObject({ code: "SMTP_NOT_CONFIGURED" });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("returns the transporter delivery receipt on success", async () => {
    const receipt = { messageId: "test-message-id" };
    const transporter = { sendMail: jest.fn().mockResolvedValue(receipt) };
    const createTransport = jest.fn(() => transporter);
    const mailer = createMailer({ config: validConfig, createTransport });

    await expect(mailer.sendMail({ to: "recipient@example.test", subject: "Test", html: "Test" })).resolves.toBe(receipt);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: validConfig.smtpHost,
      port: validConfig.smtpPort,
      auth: { user: validConfig.smtpUser, pass: validConfig.smtpPass },
    }));
  });

  it("rejects and logs delivery failures instead of returning success", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const mailer = createMailer({
      config: validConfig,
      createTransport: () => ({ sendMail: jest.fn().mockRejectedValue(Object.assign(new Error("SMTP failure"), { code: "ECONNECTION" })) }),
    });

    await expect(mailer.sendMail({ to: "recipient@example.test", subject: "Test", html: "Test" }))
      .rejects.toMatchObject({ code: "EMAIL_DELIVERY_FAILED", message: "Email delivery failed." });
    expect(consoleError).toHaveBeenCalledWith("Email delivery failed:", "ECONNECTION");
    consoleError.mockRestore();
  });

  it("does not return a sent response when the contact recipient is missing", async () => {
    const previousAdminEmail = env.adminEmail;
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    env.adminEmail = "";
    try {
      const response = await request(app).post("/api/contact").send({
        name: "Test sender",
        email: "sender@example.test",
        message: "Test message",
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Email recipient is not configured.");
    } finally {
      env.adminEmail = previousAdminEmail;
      consoleError.mockRestore();
    }
  });
});
