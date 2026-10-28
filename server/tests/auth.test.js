const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { execFileSync } = require("child_process");
const path = require("path");
const mongoose = require("mongoose");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const { createAdminAccount } = require("../src/seed/createAdmin");
const env = require("../src/config/env");

const BASE = "/api/auth";

beforeAll(async () => await connectDB());
afterAll(async () => await disconnectDB());

const customerPayload = {
  name: "Harshita Patil",
  email: "harshita@gmail.com",
  password: "StrongPass1!",
  role: "customer",
};

const farmerPayload = {
  name: "Ramesh Gouda",
  email: "ramesh@gmail.com",
  password: "FarmerPass1!",
  role: "farmer",
};

describe("Auth workflow", () => {
  let customerToken;
  let farmerToken;
  let customerId;
  let farmerId;

  it("registers a customer", async () => {
    const res = await request(app).post(`${BASE}/register`).send(customerPayload);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(customerPayload.email);
    expect(res.body.user.role).toBe("customer");
    customerToken = res.body.token;
    customerId = res.body.user.id;
  });

  it("registers a farmer", async () => {
    const res = await request(app).post(`${BASE}/register`).send(farmerPayload);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("farmer");
    expect(res.body.user.farmerApproved).toBe(false);
    farmerToken = res.body.token;
    farmerId = res.body.user.id;
  });

  it("treats a login role field as intent only and returns the database role", async () => {
    const response = await request(app)
      .post(`${BASE}/login`)
      .send({ email: customerPayload.email, password: customerPayload.password, role: "admin" });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("customer");
  });

  it("ignores a forged JWT role and enforces token expiry", async () => {
    const forgedAdminToken = jwt.sign({ id: customerId, role: "admin" }, env.jwtSecret, { expiresIn: "1h" });
    const forgedAdminAccess = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${forgedAdminToken}`);
    const expiredToken = jwt.sign({ id: customerId }, env.jwtSecret, { expiresIn: -1 });
    const expiredAccess = await request(app)
      .get(`${BASE}/me`)
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(forgedAdminAccess.status).toBe(403);
    expect(expiredAccess.status).toBe(401);
  });

  it("returns current role and farmer approval from the authenticated account", async () => {
    const response = await request(app)
      .get(`${BASE}/me`)
      .set("Authorization", `Bearer ${farmerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("farmer");
    expect(response.body.farmerApproved).toBe(false);
  });

  it("returns the saved avatar in login and authenticated profile responses", async () => {
    const User = require("../src/models/User");
    const avatar = "/uploads/avatars/farmer-profile.png";
    await User.findByIdAndUpdate(farmerId, { avatar });

    const loginResponse = await request(app)
      .post(`${BASE}/login`)
      .send({ email: farmerPayload.email, password: farmerPayload.password });
    const profileResponse = await request(app)
      .get(`${BASE}/me`)
      .auth(loginResponse.body.token, { type: "bearer" });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.avatar).toBe(avatar);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.avatar).toBe(avatar);
  });

  it("rejects duplicate email registration", async () => {
    const res = await request(app).post(`${BASE}/register`).send(customerPayload);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email in use");
  });

  it("logs in the customer", async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: customerPayload.email, password: customerPayload.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("customer");
    customerToken = res.body.token;
  });

  it("requires an Indian +91 phone number with exactly 10 digits when updating a profile", async () => {
    const invalid = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ phone: "987654321" });
    expect(invalid.status).toBe(400);

    const valid = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ phone: "+91 9876543210" });
    expect(valid.status).toBe(200);
    expect(valid.body.phone).toBe("+91 9876543210");
  });

  it("rejects an active token immediately after the account is blocked", async () => {
    const User = require("../src/models/User");
    await User.findByIdAndUpdate(customerId, { status: "blocked" });
    const response = await request(app)
      .get(`${BASE}/me`)
      .set("Authorization", `Bearer ${customerToken}`);
    await User.findByIdAndUpdate(customerId, { status: "active" });

    expect(response.status).toBe(403);
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: customerPayload.email, password: "WrongPass1!" });
    expect(res.status).toBe(401);
  });

  it("trims the email before registration and login", async () => {
    const payload = {
      ...customerPayload,
      email: "  trimmed.user@gmail.com  ",
    };
    const created = await request(app).post(`${BASE}/register`).send(payload);
    expect(created.status).toBe(200);
    expect(created.body.user.email).toBe("trimmed.user@gmail.com");

    const loginResponse = await request(app)
      .post(`${BASE}/login`)
      .send({ email: " trimmed.user@gmail.com ", password: payload.password });
    expect(loginResponse.status).toBe(200);
  });

  it("preserves configured demo-account credentials", async () => {
    const User = require("../src/models/User");
    const demoEmail = "legacy@demo.greenmart.test";
    await User.create({
      name: "Configured Demo",
      email: demoEmail,
      passwordHash: await bcrypt.hash("demo-password", 10),
      role: "customer",
      isDemo: true,
    });

    const response = await request(app)
      .post(`${BASE}/login`)
      .send({ email: ` ${demoEmail} `, password: "demo-password" });
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(demoEmail);
  });

  it.each([
    ["Uppercase@gmail.com", "StrongPass1!"],
    ["valid@outlook.com", "StrongPass1!"],
    ["valid@gmail.com", "weakpass"],
    ["valid@gmail.com", "lowercase1!"],
    ["valid@gmail.com", "UPPERCASE1!"],
    ["valid@gmail.com", "NoNumber!!"],
    ["valid@gmail.com", "NoSpecial1"],
  ])("rejects registration with invalid credentials (%s)", async (email, password) => {
    const response = await request(app)
      .post(`${BASE}/register`)
      .send({ name: "Invalid User", email, password });
    expect(response.status).toBe(400);
  });

  it("allows a valid lowercase non-Gmail admin address and rejects uppercase or malformed emails", async () => {
    const User = require("../src/models/User");
    await User.create({
      name: "Domain Admin",
      email: "domain.admin@greenmart.com",
      passwordHash: await bcrypt.hash("DomainAdmin1!", 10),
      role: "admin",
    });
    const validAdmin = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "domain.admin@greenmart.com", password: "DomainAdmin1!" });
    const uppercaseEmail = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "Harshita@gmail.com", password: customerPayload.password });
    const malformedEmail = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "not-an-email", password: customerPayload.password });
    const weakPassword = await request(app)
      .post(`${BASE}/login`)
      .send({ email: customerPayload.email, password: "weakpass" });
    expect(validAdmin.status).toBe(200);
    expect(validAdmin.body.user.role).toBe("admin");
    expect(uppercaseEmail.status).toBe(400);
    expect(malformedEmail.status).toBe(400);
    expect(weakPassword.status).toBe(400);
  });

  it("gets current user with valid token", async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(customerPayload.email);
  });

  it("rejects /me without token", async () => {
    const res = await request(app).get(`${BASE}/me`);
    expect(res.status).toBe(401);
  });

  it("hashes passwords in the database", async () => {
    const User = require("../src/models/User");
    const user = await User.findById(customerId);
    expect(user.passwordHash).not.toBe(customerPayload.password);
    const match = await bcrypt.compare(customerPayload.password, user.passwordHash);
    expect(match).toBe(true);
  });

  it("creates an admin with a bcrypt hash, authenticates it, and does not overwrite it on rerun", async () => {
    const email = "initial.admin@gmail.com";
    const password = "InitialAdmin1!";
    const firstRun = await createAdminAccount(email, password);
    expect(firstRun.created).toBe(true);

    const User = require("../src/models/User");
    const user = await User.findOne({ email });
    expect(user.role).toBe("admin");
    expect(user.passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);

    const savedHash = user.passwordHash;
    const loginResponse = await request(app)
      .post(`${BASE}/login`)
      .send({ email, password });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.role).toBe("admin");

    const secondRun = await createAdminAccount(email, "ChangedAdmin2!");
    expect(secondRun.created).toBe(false);
    expect((await User.findOne({ email })).passwordHash).toBe(savedHash);
  });

  it("runs the admin seed command idempotently against the configured database", async () => {
    const email = "cli.admin@gmail.com";
    const script = path.join(__dirname, "../src/seed/createAdmin.js");
    const mongoUri = `mongodb://${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`;
    const runSeed = (password) => execFileSync(process.execPath, [script], {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        MONGO_URI: mongoUri,
        ADMIN_EMAIL: email,
        ADMIN_PASSWORD: password,
      },
    });

    expect(runSeed("CliAdmin1!")).toContain("Created admin account");
    const User = require("../src/models/User");
    const created = await User.findOne({ email });
    const originalHash = created.passwordHash;
    expect(await bcrypt.compare("CliAdmin1!", originalHash)).toBe(true);

    expect(runSeed("DifferentAdmin2!")).toContain("left it unchanged");
    expect((await User.findOne({ email })).passwordHash).toBe(originalHash);
  });

  it("refuses to turn an existing customer or farmer into an admin", async () => {
    await expect(createAdminAccount(customerPayload.email, "NewAdminPass1!"))
      .rejects.toThrow(/belongs to a non-admin account/i);
    await expect(createAdminAccount(farmerPayload.email, "NewAdminPass1!"))
      .rejects.toThrow(/belongs to a non-admin account/i);
  });

  it("validates configured admin email and password before creating an account", async () => {
    await expect(createAdminAccount("Admin@greenmart.com", "ValidAdmin1!"))
      .rejects.toThrow(/lowercase email/i);
    await expect(createAdminAccount("valid.admin@gmail.com", "weakpass"))
      .rejects.toThrow(/ADMIN_PASSWORD/i);
  });
});
