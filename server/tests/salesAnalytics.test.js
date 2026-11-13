const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");
const Category = require("../src/models/Category");

let adminToken;
let customerToken;
let farmerToken;
let adminId;
let customerId;
let farmerId;
let productAId;
let productBId;
let deletedProductId;

beforeAll(async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash("TestPass1!", 10);
  const [admin, customer, farmer] = await Promise.all([
    User.create({ name: "SA Admin", email: "sa.admin@example.test", passwordHash, role: "admin" }),
    User.create({ name: "SA Customer", email: "sa.customer@example.test", passwordHash, role: "customer" }),
    User.create({ name: "SA Farmer", email: "sa.farmer@example.test", passwordHash, role: "farmer" }),
  ]);
  adminId = admin._id;
  customerId = customer._id;
  farmerId = farmer._id;
  await Category.create({ name: "Vegetables", isActive: true });
  await Category.create({ name: "Fruits", isActive: true });
  const productA = await Product.create({ name: "Carrots", description: "d", category: "Vegetables", price: 10, stock: 10, farmer: farmerId });
  const productB = await Product.create({ name: "Apples", description: "d", category: "Fruits", price: 20, stock: 10, farmer: farmerId });
  const deletedProduct = await Product.create({ name: "Old Potatoes", description: "d", category: "Vegetables", price: 30, stock: 10, farmer: farmerId, isDeleted: true });
  productAId = productA._id;
  productBId = productB._id;
  deletedProductId = deletedProduct._id;

  // Delivered order on 2026-10-05 (multi-item: 2 carrots + 1 apples)
  await Order.create({
    orderNumber: "GM-SA-001",
    user: customerId,
    items: [
      { product: productAId, name: "Carrots", price: 10, quantity: 2, farmer: farmerId },
      { product: productBId, name: "Apples", price: 20, quantity: 1, farmer: farmerId },
    ],
    status: "Delivered",
    paymentStatus: "Paid",
    total: 40,
    createdAt: new Date("2026-10-05T10:00:00.000Z"),
  });
  // Delivered order on 2026-10-10 at end of day (tests inclusive end boundary)
  await Order.create({
    orderNumber: "GM-SA-002",
    user: customerId,
    items: [
      { product: deletedProductId, name: "Old Potatoes", price: 30, quantity: 1, farmer: farmerId },
    ],
    status: "Delivered",
    paymentStatus: "Paid",
    total: 30,
    createdAt: new Date("2026-10-10T23:30:00.000Z"),
  });
  // Cancelled order must be excluded
  await Order.create({
    orderNumber: "GM-SA-003",
    user: customerId,
    items: [{ product: productAId, name: "Carrots", price: 10, quantity: 5, farmer: farmerId }],
    status: "Cancelled",
    paymentStatus: "Paid",
    total: 50,
    createdAt: new Date("2026-10-07T10:00:00.000Z"),
  });
  // Delivery failed order must be excluded
  await Order.create({
    orderNumber: "GM-SA-004",
    user: customerId,
    items: [{ product: productBId, name: "Apples", price: 20, quantity: 3, farmer: farmerId }],
    status: "Delivery Failed",
    paymentStatus: "Paid",
    total: 60,
    createdAt: new Date("2026-10-08T10:00:00.000Z"),
  });
  // Failed payment must be excluded
  await Order.create({
    orderNumber: "GM-SA-005",
    user: customerId,
    items: [{ product: productAId, name: "Carrots", price: 10, quantity: 1, farmer: farmerId }],
    status: "Delivered",
    paymentStatus: "Failed",
    total: 10,
    createdAt: new Date("2026-10-09T10:00:00.000Z"),
  });

  const [adminLogin, customerLogin, farmerLogin] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: admin.email, password: "TestPass1!" }),
    request(app).post("/api/auth/login").send({ email: customer.email, password: "TestPass1!" }),
    request(app).post("/api/auth/login").send({ email: farmer.email, password: "TestPass1!" }),
  ]);
  adminToken = adminLogin.body.token;
  customerToken = customerLogin.body.token;
  farmerToken = farmerLogin.body.token;
});

afterAll(async () => { await disconnectDB(); });

describe("Admin sales analytics", () => {
  it("returns the required response structure with real aggregated sales", async () => {
    const res = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "2026-10-01", to: "2026-10-10" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalSales");
    expect(res.body).toHaveProperty("totalOrders");
    expect(res.body).toHaveProperty("averageOrderValue");
    expect(res.body).toHaveProperty("salesOverview");
    expect(res.body).toHaveProperty("salesByCategory");
    expect(res.body).toHaveProperty("topSellingProducts");
    // 2 delivered eligible orders: GM-SA-001 (40) + GM-SA-002 (30)
    expect(res.body.totalOrders).toBe(2);
    expect(res.body.totalSales).toBe(70);
    expect(res.body.averageOrderValue).toBe(35);
  });

  it("includes historical sales for soft-deleted products", async () => {
    const res = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "2026-10-01", to: "2026-10-10" })
      .set("Authorization", `Bearer ${adminToken}`);
    const potatoSale = (res.body.topSellingProducts || []).find((p) => p.name === "Old Potatoes");
    expect(potatoSale).toBeDefined();
    expect(potatoSale.quantity).toBe(1);
    expect(potatoSale.revenue).toBe(30);
    expect(potatoSale.productIds).toContain(String(deletedProductId));
  });

  it("excludes cancelled and failed orders from sales totals", async () => {
    const res = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "2026-10-01", to: "2026-10-10" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.body.totalOrders).toBe(2);
    expect(res.body.totalSales).toBe(70);
  });

  it("includes the complete end date (boundary inclusive)", async () => {
    const fullRange = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "2026-10-01", to: "2026-10-10" })
      .set("Authorization", `Bearer ${adminToken}`);
    const endDayExcluded = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "2026-10-01", to: "2026-10-09" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(fullRange.body.totalOrders).toBe(2);
    expect(endDayExcluded.body.totalOrders).toBe(1);
  });

  it("counts each order once even with multiple items", async () => {
    const res = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "2026-10-01", to: "2026-10-10" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.body.totalOrders).toBe(2);
  });

  it("aggregates category sales and top-selling products from order items", async () => {
    const res = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "2026-10-01", to: "2026-10-10" })
      .set("Authorization", `Bearer ${adminToken}`);
    const vegetables = (res.body.salesByCategory || []).find((c) => c.category === "Vegetables");
    // Carrots 2x10 = 20 + Potatoes 30 = 50
    expect(vegetables).toBeDefined();
    expect(vegetables.revenue).toBe(50);
    const carrots = (res.body.topSellingProducts || []).find((p) => p.name === "Carrots");
    expect(carrots).toBeDefined();
    expect(carrots.quantity).toBe(2);
    expect(carrots.revenue).toBe(20);
    expect(carrots.productIds).toContain(String(productAId));
  });

  it("rejects invalid dates instead of returning zero", async () => {
    const res = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "not-a-date", to: "2026-10-10" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it("rejects non-admin access", async () => {
    const anonymous = await request(app).get("/api/admin/analytics").query({ from: "2026-10-01", to: "2026-10-10" });
    const customer = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "2026-10-01", to: "2026-10-10" })
      .set("Authorization", `Bearer ${customerToken}`);
    const farmer = await request(app)
      .get("/api/admin/analytics")
      .query({ from: "2026-10-01", to: "2026-10-10" })
      .set("Authorization", `Bearer ${farmerToken}`);
    expect(anonymous.status).toBe(401);
    expect(customer.status).toBe(403);
    expect(farmer.status).toBe(403);
  });
});
