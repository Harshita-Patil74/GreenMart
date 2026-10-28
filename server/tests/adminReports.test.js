const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");

const authHeader = (token) => `Bearer ${token}`;
const parsePdf = (response, callback) => {
  const chunks = [];
  response.on("data", (chunk) => chunks.push(chunk));
  response.on("end", () => callback(null, Buffer.concat(chunks)));
};
const readPdfText = (buffer) => [...buffer.toString("latin1").matchAll(/<([0-9a-f]+)>/gi)]
  .map(([, hex]) => Buffer.from(hex, "hex").toString("latin1"))
  .join("");

let adminToken;
let farmerToken;
let customerToken;

beforeAll(async () => {
  await connectDB();
  const [admin, farmer, customer] = await Promise.all([
    User.create({ name: "Report Admin", email: "report.admin@example.test", passwordHash: await bcrypt.hash("TestPass1!", 10), role: "admin" }),
    User.create({ name: "Report Farmer", email: "report.farmer@example.test", passwordHash: await bcrypt.hash("TestPass1!", 10), role: "farmer" }),
    User.create({ name: "Report Customer", email: "report.customer@example.test", passwordHash: await bcrypt.hash("TestPass1!", 10), role: "customer" }),
  ]);
  const [adminLogin, farmerLogin, customerLogin] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: admin.email, password: "TestPass1!" }),
    request(app).post("/api/auth/login").send({ email: farmer.email, password: "TestPass1!" }),
    request(app).post("/api/auth/login").send({ email: customer.email, password: "TestPass1!" }),
  ]);
  adminToken = adminLogin.body.token;
  farmerToken = farmerLogin.body.token;
  customerToken = customerLogin.body.token;

  const vegetable = await Product.create({
    name: "PDF Test Tomatoes",
    category: "Vegetables",
    price: 125.5,
    stock: 10,
    farmer: farmer._id,
  });
  const fruit = await Product.create({
    name: "PDF Test Apples",
    category: "Fruits",
    price: 88,
    stock: 10,
    farmer: farmer._id,
  });
  await Order.create([
    {
      orderNumber: "GM-PDF-VEGETABLE",
      user: customer._id,
      items: [{ product: vegetable._id, name: vegetable.name, price: vegetable.price, quantity: 1, farmer: farmer._id }],
      status: "Delivered",
      total: 125.5,
      createdAt: new Date("2026-10-05T10:00:00.000Z"),
    },
    {
      orderNumber: "GM-PDF-FRUIT",
      user: customer._id,
      items: [{ product: fruit._id, name: fruit.name, price: fruit.price, quantity: 1, farmer: farmer._id }],
      status: "Delivered",
      total: 88,
      createdAt: new Date("2026-10-06T10:00:00.000Z"),
    },
    {
      orderNumber: "GM-PDF-OUTSIDE-DATE",
      user: customer._id,
      items: [{ product: vegetable._id, name: vegetable.name, price: vegetable.price, quantity: 1, farmer: farmer._id }],
      status: "Delivered",
      total: 999,
      createdAt: new Date("2026-09-30T10:00:00.000Z"),
    },
  ]);
});

afterAll(async () => disconnectDB());

describe("Admin PDF reports", () => {
  it("returns an authenticated, filtered PDF attachment with report data", async () => {
    const response = await request(app)
      .get("/api/admin/reports/pdf")
      .query({
        type: "Sales Report",
        from: "2026-10-01",
        to: "2026-10-31",
        category: "Vegetables",
      })
      .set("Authorization", authHeader(adminToken))
      .buffer(true)
      .parse(parsePdf);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toBe('attachment; filename="greenmart-sales-report.pdf"');
    expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
    const pdfText = readPdfText(response.body);
    expect(pdfText).toContain("GM-PDF-VEGETABLE");
    expect(pdfText).toContain("INR 125.50");
    expect(pdfText).not.toContain("GM-PDF-FRUIT");
    expect(pdfText).not.toContain("GM-PDF-OUTSIDE-DATE");
    expect(response.body.toString().trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("rejects requests without admin authorization", async () => {
    const anonymous = await request(app).get("/api/admin/reports/pdf").query({ type: "Sales Report" });
    const customer = await request(app)
      .get("/api/admin/reports/pdf")
      .query({ type: "Sales Report" })
      .set("Authorization", authHeader(customerToken));
    const farmer = await request(app)
      .get("/api/admin/reports/pdf")
      .query({ type: "Sales Report" })
      .set("Authorization", authHeader(farmerToken));

    expect(anonymous.status).toBe(401);
    expect(customer.status).toBe(403);
    expect(farmer.status).toBe(403);
  });

  it("returns a JSON validation error for invalid report filters", async () => {
    const response = await request(app)
      .get("/api/admin/reports/pdf")
      .query({ type: "Sales Report", from: "not-a-date" })
      .set("Authorization", authHeader(adminToken));

    expect(response.status).toBe(400);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body.message).toMatch(/invalid from date/i);
  });
});
