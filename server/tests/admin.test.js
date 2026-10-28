// @ts-nocheck
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");

const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Setting = require("../src/models/Setting");

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
      .send({ name: "Assigned farmer product", category: "Vegetables", price: 10, farmer: farmerId });
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
