jest.mock("../src/services/statsService", () => ({
  adminStats: jest.fn().mockResolvedValue({}),
}));
jest.mock("../src/models/User", () => ({ findById: jest.fn(), find: jest.fn() }));
jest.mock("../src/models/Product", () => ({ find: jest.fn() }));
jest.mock("../src/models/Order", () => ({ countDocuments: jest.fn() }));
jest.mock("../src/models/FarmerProfile", () => ({
  findOne: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { app } = require("../tests/setup");
const User = require("../src/models/User");
const env = require("../src/config/env");

const ADMIN = "507f1f77bcf86cd799439031";
const CUSTOMER = "507f1f77bcf86cd799439032";
const FARMER = "507f1f77bcf86cd799439033";

describe("admin authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "x", role: "customer", status: "active", toObject: () => ({ _id: "x", role: "customer" }) }) });
  });

  function mockUser(id, role) {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: id, role, status: "active", toObject: () => ({ _id: id, role }) }) });
  }

  it("rejects unauthenticated", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  it("rejects customer", async () => {
    mockUser(CUSTOMER, "customer");
    const token = jwt.sign({ id: CUSTOMER }, env.jwtSecret);
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("rejects farmer", async () => {
    mockUser(FARMER, "farmer");
    const token = jwt.sign({ id: FARMER }, env.jwtSecret);
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows admin", async () => {
    mockUser(ADMIN, "admin");
    const token = jwt.sign({ id: ADMIN }, env.jwtSecret);
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
