const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { app } = require("../tests/setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const env = require("../src/config/env");

const ADMIN = "507f1f77bcf86cd799439031";
const CUSTOMER = "507f1f77bcf86cd799439032";
const FARMER = "507f1f77bcf86cd799439033";

describe("admin authorization", () => {
  beforeAll(async () => {
    await connectDB();
    const passwordHash = await bcrypt.hash("TestPass1!", 10);
    await User.create({
      _id: ADMIN,
      name: "Admin User",
      email: "admin@example.test",
      passwordHash,
      role: "admin",
    });
    await User.create({
      _id: CUSTOMER,
      name: "Customer User",
      email: "customer@example.test",
      passwordHash,
      role: "customer",
    });
    await User.create({
      _id: FARMER,
      name: "Farmer User",
      email: "farmer@example.test",
      passwordHash,
      role: "farmer",
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  it("rejects customer", async () => {
    const token = jwt.sign({ id: CUSTOMER }, env.jwtSecret);
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("rejects farmer", async () => {
    const token = jwt.sign({ id: FARMER }, env.jwtSecret);
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows admin", async () => {
    const token = jwt.sign({ id: ADMIN }, env.jwtSecret);
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
