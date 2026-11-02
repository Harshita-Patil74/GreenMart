// @ts-nocheck
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");

const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Setting = require("../src/models/Setting");
const AdminAuditLog = require("../src/models/AdminAuditLog");
const { hashToken } = require("../src/utils/tokens");
const env = require("../src/config/env");

let adminToken, farmerToken, otherFarmerToken, customerToken, farmerId, adminId, productId;
const authHeader = (token) => ["Bear", "er ", token].join("");

beforeAll(async () => {
  await connectDB();
  const admin = await User.create({
    name: "Admin User",
    email: "admin.verify@demo.greenmart.test",
    passwordHash: await bcrypt.hash("admin-password", 10),
    role: "admin",
  });
  adminId = admin._id;
  const farmer = await User.create({
    name: "Unverified Farmer",
    email: "unverified.farmer@demo.greenmart.test",
    passwordHash: await bcrypt.hash("demo-password", 10),
    role: "farmer",
  });
  farmerId = farmer._id;
  const otherFarmer = await User.create({
    name: "Second Farmer",
    email: "second.farmer@demo.greenmart.test",
    passwordHash: await bcrypt.hash("demo-password", 10),
    role: "farmer",
  });
  const customer = await User.create({
    name: "Customer User",
    email: "customer.verify@demo.greenmart.test",
    passwordHash: await bcrypt.hash("demo-password", 10),
    role: "customer",
  });

  await FarmerProfile.create({
    user: farmerId,
    farmName: "Unverified Farm",
    address: "Village Road",
    certification: { verifiedByAdmin: false },
  });

  const adminResponse = await request(app).post("/api/auth/login").send({ email: admin.email, password: "admin-password" });
  adminToken = adminResponse.body.token;
  const farmerResponse = await request(app).post("/api/auth/login").send({ email: farmer.email, password: "demo-password" });
  farmerToken = farmerResponse.body.token;
  const otherFarmerResponse = await request(app).post("/api/auth/login").send({ email: otherFarmer.email, password: "demo-password" });
  otherFarmerToken = otherFarmerResponse.body.token;
  const customerResponse = await request(app).post("/api/auth/login").send({ email: customer.email, password: "demo-password" });
  customerToken = customerResponse.body.token;
});

afterAll(async () => disconnectDB());

describe("Admin farmer verification", () => {
  it("returns farmer contact, certification, and submission date only to admins", async () => {
    const listedFarmer = await User.create({
      name: "Listed Farmer",
      email: "listed.farmer@demo.greenmart.test",
      passwordHash: await bcrypt.hash("demo-password", 10),
      role: "farmer",
    });
    const profile = await FarmerProfile.create({
      user: listedFarmer._id,
      farmName: "Listed Farm",
      certification: { body: "Organic", number: "CERT-123" },
    });

    const response = await request(app)
      .get("/api/admin/farmers")
      .set("Authorization", authHeader(adminToken));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        _id: String(profile._id),
        farmName: "Listed Farm",
        createdAt: expect.any(String),
        user: expect.objectContaining({
          _id: String(listedFarmer._id),
          name: "Listed Farmer",
          email: "listed.farmer@demo.greenmart.test",
          accountActivated: true,
        }),
        certification: expect.objectContaining({ body: "Organic", number: "CERT-123" }),
      }),
    ]));
    const listedResponse = response.body.find((item) => item.user?._id === String(listedFarmer._id));
    expect(listedResponse.user).not.toHaveProperty("passwordHash");
    expect(listedResponse.user).not.toHaveProperty("activationTokenHash");
    expect(listedResponse.user).not.toHaveProperty("resetTokenHash");
  });

  it("creates an inactive farmer account without admin-supplied credentials", async () => {
    const email = "admin.created.farmer@gmail.com";
    const response = await request(app)
      .post("/api/admin/farmers")
      .set("Authorization", authHeader(adminToken))
      .send({
        name: "Admin Created Farmer",
        email,
        phone: "+91 9876543210",
        farmName: "Admin Created Farm",
        about: "Small organic farm",
        password: "AdminChosen@2026#",
        confirmPassword: "AdminChosen@2026#",
      });

    expect(response.status).toBe(201);
    expect(response.body.activationLink).toBeUndefined();
    const createdUser = await User.findOne({ email });
    expect(createdUser.role).toBe("farmer");
    expect(createdUser.accountActivated).toBe(false);
    expect(createdUser.activationTokenHash).toBeTruthy();
    expect(createdUser.activationTokenExpiry.getTime()).toBeGreaterThan(Date.now());
    expect(await bcrypt.compare("AdminChosen@2026#", createdUser.passwordHash)).toBe(false);
    expect(response.body).not.toHaveProperty("passwordHash");
    expect(response.body).not.toHaveProperty("activationTokenHash");
    const adminUsers = await request(app)
      .get("/api/admin/users?role=farmer")
      .set("Authorization", authHeader(adminToken));
    const createdResponseUser = adminUsers.body.find((item) => item.email === email);
    expect(createdResponseUser).toBeDefined();
    expect(createdResponseUser).not.toHaveProperty("passwordHash");
    expect(createdResponseUser).not.toHaveProperty("activationTokenHash");
    expect(createdResponseUser).not.toHaveProperty("resetTokenHash");
    const profile = await FarmerProfile.findOne({ user: createdUser._id });
    expect(profile.farmName).toBe("Admin Created Farm");
    expect(profile.description).toBe("Small organic farm");
    const auditEntry = await AdminAuditLog.findOne({ targetUser: createdUser._id });
    expect(auditEntry.action).toBe("farmer.account.created");
    expect(auditEntry.toObject()).not.toHaveProperty("token");
    expect(auditEntry.toObject()).not.toHaveProperty("password");
  });

  it("activates a farmer account with a single-use token and farmer-chosen password", async () => {
    const user = await User.findOne({ email: "admin.created.farmer@gmail.com" });
    const activationToken = "single-use-activation-token";
    user.activationTokenHash = await hashToken(activationToken);
    user.activationTokenExpiry = new Date(Date.now() + 60_000);
    await user.save();

    const beforeActivation = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "FarmerChosen@2026" });
    expect(beforeActivation.status).toBe(403);

    const activation = await request(app)
      .post("/api/auth/activate-account")
      .send({ email: user.email, token: activationToken, password: "FarmerChosen@2026" });
    expect(activation.status).toBe(200);
    expect(activation.body.message).toMatch(/activated/i);

    const activatedUser = await User.findById(user._id);
    expect(activatedUser.accountActivated).toBe(true);
    expect(activatedUser.activationTokenHash).toBeUndefined();
    expect(activatedUser.activationTokenExpiry).toBeUndefined();
    expect(await bcrypt.compare("FarmerChosen@2026", activatedUser.passwordHash)).toBe(true);

    const reusedToken = await request(app)
      .post("/api/auth/activate-account")
      .send({ email: user.email, token: activationToken, password: "FarmerChosen@2026" });
    expect(reusedToken.status).toBe(400);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "FarmerChosen@2026" });
    expect(login.status).toBe(200);
  });

  it("provides an activation link only in development when email is unavailable", async () => {
    const previousNodeEnv = env.nodeEnv;
    env.nodeEnv = "development";
    try {
      const email = "development.farmer@gmail.com";
      const response = await request(app)
        .post("/api/admin/farmers")
        .set("Authorization", authHeader(adminToken))
        .send({ name: "Development Farmer", email });

      expect(response.status).toBe(201);
      expect(response.body.activationLink).toContain("#token=");
      const activationUrl = new URL(response.body.activationLink);
      const token = new URLSearchParams(activationUrl.hash.slice(1)).get("token");
      const user = await User.findOne({ email });
      expect(await bcrypt.compare(token, user.activationTokenHash)).toBe(true);
      expect(response.body).not.toHaveProperty("activationTokenHash");
    } finally {
      env.nodeEnv = previousNodeEnv;
    }
  });

  it("never returns an activation link when email is unavailable in production", async () => {
    const previousNodeEnv = env.nodeEnv;
    env.nodeEnv = "production";
    try {
      const response = await request(app)
        .post("/api/admin/farmers")
        .set("Authorization", authHeader(adminToken))
        .send({ name: "Production Farmer", email: "production.farmer@gmail.com" });

      expect(response.status).toBe(201);
      expect(response.body.activationEmailSent).toBe(false);
      expect(response.body.activationLink).toBeUndefined();
    } finally {
      env.nodeEnv = previousNodeEnv;
    }
  });

  it("rejects duplicate admin-created farmer emails with a clear message", async () => {
    const response = await request(app)
      .post("/api/admin/farmers")
      .set("Authorization", authHeader(adminToken))
      .send({
        name: "Duplicate Farmer",
        email: "unverified.farmer@demo.greenmart.test",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email is already registered.");
  });

  it.each([
    "Bad.Email@example.com",
    ".bad@example.com",
    "bad..email@example.com",
    "bad email@example.com",
  ])("rejects invalid admin-created farmer email addresses", async (email) => {
    const response = await request(app)
      .post("/api/admin/farmers")
      .set("Authorization", authHeader(adminToken))
      .send({ name: "Invalid Farmer", email });

    expect(response.status).toBe(400);
  });

  it("does not grant admin privileges through public registration", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Attempted Admin",
        email: "attempted.admin@gmail.com",
        password: "StrongPass1!",
        role: "admin",
      });
    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("customer");
  });

  it("admin verifies a farmer's certification", async () => {
    const response = await request(app)
      .patch(`/api/admin/farmers/${farmerId}/verify`)
      .set("Authorization", authHeader(adminToken));
    expect(response.status).toBe(200);
    expect(response.body.certification.verifiedByAdmin).toBe(true);
    expect(response.body.certification.verifiedAt).toBeDefined();
  });

  it("admin can reject a farmer's certification with a reason", async () => {
    const response = await request(app)
      .patch(`/api/admin/farmers/${farmerId}/reject`)
      .set("Authorization", authHeader(adminToken))
      .send({ reason: "Certification document is unclear." });
    expect(response.status).toBe(200);
    expect(response.body.certification.verifiedByAdmin).toBe(false);
    expect(response.body.certification.rejectedByAdmin).toBe(true);
    expect(response.body.certification.rejectionReason).toBe("Certification document is unclear.");
  });

  it("farmer cannot verify another farmer", async () => {
    const response = await request(app)
      .patch(`/api/admin/farmers/${farmerId}/verify`)
      .set("Authorization", authHeader(farmerToken));
    expect(response.status).toBe(403);
  });

  it("rejects unauthenticated verification requests", async () => {
    const response = await request(app).patch(`/api/admin/farmers/${farmerId}/verify`);
    expect(response.status).toBe(401);
  });

  it("denies customers access to admin-only APIs", async () => {
    const response = await request(app)
      .get("/api/admin/users")
      .set("Authorization", authHeader(customerToken));
    expect(response.status).toBe(403);

    const farmersResponse = await request(app)
      .get("/api/admin/farmers")
      .set("Authorization", authHeader(customerToken));
    expect(farmersResponse.status).toBe(403);
  });
});

describe("Admin account and product safeguards", () => {
  it("rejects unsupported account roles", async () => {
    const response = await request(app)
      .patch(`/api/admin/users/${farmerId}`)
      .set("Authorization", authHeader(adminToken))
      .send({ role: "superadmin" });
    expect(response.status).toBe(400);
  });

  describe("Admin platform delivery settings", () => {
    it("saves and returns standard, express, and remote-area delivery charges", async () => {
      const response = await request(app)
        .put("/api/settings")
        .set("Authorization", authHeader(adminToken))
        .send({ deliveryCharge: 30, expressDeliveryCharge: 4, remoteAreaDeliveryCharge: 7 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        deliveryCharge: 30,
        expressDeliveryCharge: 4,
        remoteAreaDeliveryCharge: 7,
      });

      const settings = await request(app).get("/api/settings");
      expect(settings.status).toBe(200);
      expect(settings.body).toMatchObject({
        deliveryCharge: 30,
        expressDeliveryCharge: 4,
        remoteAreaDeliveryCharge: 7,
      });
    });

    it("rejects negative delivery charges and preserves existing settings", async () => {
      const response = await request(app)
        .put("/api/settings")
        .set("Authorization", authHeader(adminToken))
        .send({ expressDeliveryCharge: -1 });

      expect(response.status).toBe(400);
      const settings = await Setting.findOne();
      expect(settings.expressDeliveryCharge).toBe(4);
    });
  });

  it("prevents an administrator from changing their own role", async () => {
    const response = await request(app)
      .patch(`/api/admin/users/${adminId}`)
      .set("Authorization", authHeader(adminToken))
      .send({ role: "customer" });
    expect(response.status).toBe(403);
  });

  it("requires admin-created products to be assigned to a real farmer", async () => {
    const invalid = await request(app)
      .post("/api/products")
      .set("Authorization", authHeader(adminToken))
      .send({ name: "Invalid owner product", category: "Vegetables", price: 10, farmer: adminId });
    expect(invalid.status).toBe(400);

    const valid = await request(app)
      .post("/api/products")
      .set("Authorization", authHeader(adminToken))
      .send({ name: "Assigned farmer product", category: "Vegetables", price: 10, farmer: farmerId, description: "Assigned farmer product description" });
    expect(valid.status).toBe(201);
    expect(String(valid.body.farmer)).toBe(String(farmerId));
    productId = valid.body._id;
  });

  it("prevents one farmer from changing or deleting another farmer's product", async () => {
    const update = await request(app)
      .put(`/api/products/${productId}`)
      .set("Authorization", authHeader(otherFarmerToken))
      .send({ stock: 999 });
    expect(update.status).toBe(403);

    const remove = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", authHeader(otherFarmerToken));
    expect(remove.status).toBe(403);
  });
});
