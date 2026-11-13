const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const { signToken } = require("../src/utils/tokens");

let adminToken;
let prefix;

beforeAll(async () => {
  await connectDB();
  prefix = `pagination-search-${Date.now()}`;
  const passwordHash = await bcrypt.hash("ValidPass1!", 10);
  const admin = await User.create({
    name: "Pagination Test Admin",
    email: `admin-${Date.now()}@greenmart.test`,
    passwordHash,
    role: "admin",
  });
  adminToken = signToken(admin);

  await User.create(Array.from({ length: 21 }, (_, index) => {
    const number = index + 1;
    return {
      name: `${prefix} User ${number}`,
      email: `${prefix}-${number}@greenmart.test`,
      phone: `800000${String(number).padStart(4, "0")}`,
      passwordHash,
      role: number === 12 ? "farmer" : "customer",
      status: number % 2 === 0 ? "blocked" : "active",
      createdAt: new Date(Date.now() + number * 1000),
    };
  }));
});

afterAll(async () => {
  await disconnectDB();
});

describe("Admin user server pagination", () => {
  it("returns all pages once with matching total and page metadata", async () => {
    const pages = [];
    for (const page of [1, 2, 3]) {
      const response = await request(app)
        .get("/api/admin/users")
        .query({ page, limit: 10, search: prefix })
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 21, pages: 3, page, limit: 10 });
      pages.push(...response.body.items.map((user) => user._id));
      expect(response.body.items.length).toBe(page === 3 ? 1 : 10);
    }

    expect(new Set(pages).size).toBe(21);
  });

  it("applies phone, role, and status filters before counting and paging", async () => {
    const response = await request(app)
      .get("/api/admin/users")
      .query({ search: "8000000012", role: "farmer", status: "blocked", page: 1, limit: 10 })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 1, pages: 1, page: 1, limit: 10 });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({ phone: "8000000012", role: "farmer", status: "blocked" });
  });

  it("defaults to ten records per page", async () => {
    const response = await request(app)
      .get("/api/admin/users")
      .query({ search: prefix })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(10);
    expect(response.body).toMatchObject({ total: 21, page: 1, pages: 3, limit: 10 });
  });
});
