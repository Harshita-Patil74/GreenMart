const request = require("supertest");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");
const mongoose = require("mongoose");

let customerToken;
let otherCustomerToken;
let farmerToken;
let otherFarmerToken;
let adminToken;
let productId;
let orderId;
let orderDate;

beforeAll(async () => {
  await connectDB();
  const passwordHash = await require("bcryptjs").hash("SearchTestPass1!", 10);
  const [customer, otherCustomer, farmer, otherFarmer, admin] = await Promise.all([
    User.create({ name: "Search Customer", email: "search.customer@example.test", passwordHash, role: "customer" }),
    User.create({ name: "Other Search Customer", email: "other.search.customer@example.test", passwordHash, role: "customer" }),
    User.create({ name: "Search Farmer", email: "search.farmer@example.test", passwordHash, role: "farmer" }),
    User.create({ name: "Other Search Farmer", email: "other.search.farmer@example.test", passwordHash, role: "farmer" }),
    User.create({ name: "Search Admin", email: "search.admin@example.test", passwordHash, role: "admin" }),
  ]);
  await FarmerProfile.create([
    { user: farmer._id, farmName: "Search Farm", certification: { verifiedByAdmin: true } },
    { user: otherFarmer._id, farmName: "Other Search Farm", certification: { verifiedByAdmin: true } },
  ]);
  const [customerLogin, otherCustomerLogin, farmerLogin, otherFarmerLogin, adminLogin] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: customer.email, password: "SearchTestPass1!" }),
    request(app).post("/api/auth/login").send({ email: otherCustomer.email, password: "SearchTestPass1!" }),
    request(app).post("/api/auth/login").send({ email: farmer.email, password: "SearchTestPass1!" }),
    request(app).post("/api/auth/login").send({ email: otherFarmer.email, password: "SearchTestPass1!" }),
    request(app).post("/api/auth/login").send({ email: admin.email, password: "SearchTestPass1!" }),
  ]);
  customerToken = customerLogin.body.token;
  otherCustomerToken = otherCustomerLogin.body.token;
  farmerToken = farmerLogin.body.token;
  otherFarmerToken = otherFarmerLogin.body.token;
  adminToken = adminLogin.body.token;

  const [product, otherProduct] = await Product.create([
    {
      name: "Pure Natural Honey",
      description: "Raw wildflower honey",
      category: "Pantry",
      price: 250,
      stock: 12,
      farmer: farmer._id,
    },
    {
      name: "Blueberry Basket",
      description: "Fresh berries",
      category: "Fruit",
      price: 150,
      stock: 10,
      farmer: otherFarmer._id,
    },
  ]);
  productId = product._id;

  const [order, mixedOrder] = await Order.create([
    {
      orderNumber: "GM-SEARCH-1001",
      user: customer._id,
      items: [{ product: product._id, name: product.name, price: product.price, quantity: 1, farmer: farmer._id }],
      address: { name: customer.name, line1: "Test Lane", city: "Test City", phone: "5550100" },
      paymentMethod: "UPI",
      status: "Order Placed",
      subtotal: product.price,
      total: product.price,
    },
    {
      orderNumber: "GM-SEARCH-MIXED",
      user: customer._id,
      items: [
        { product: product._id, name: product.name, price: product.price, quantity: 1, farmer: farmer._id },
        { product: otherProduct._id, name: otherProduct.name, price: otherProduct.price, quantity: 1, farmer: otherFarmer._id },
      ],
      address: { name: customer.name, line1: "Test Lane", city: "Test City", phone: "5550100" },
      paymentMethod: "UPI",
      status: "Order Placed",
      subtotal: product.price + otherProduct.price,
      total: product.price + otherProduct.price,
    },
  ]);
  orderId = order._id;
  orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
  expect(mixedOrder).toBeDefined();
});

afterAll(async () => {
  await disconnectDB();
});

describe("role-scoped product and order search", () => {
  it("supports tokenized product name and exact stable Product ID searches", async () => {
    const nameSearch = await request(app)
      .get("/api/products/storefront")
      .query({ search: "  pure natural hon " });
    expect(nameSearch.status).toBe(200);
    expect(nameSearch.body.items.map((item) => item._id)).toContain(String(productId));

    const idSearch = await request(app)
      .get("/api/products/storefront")
      .query({ search: String(productId) });
    expect(idSearch.status).toBe(200);
    expect(idSearch.body.items.map((item) => item._id)).toContain(String(productId));

    const managementSearch = await request(app)
      .get("/api/products")
      .query({ search: String(productId) });
    expect(managementSearch.status).toBe(200);
    expect(managementSearch.body.items.map((item) => item._id)).toContain(String(productId));

    const escapedSearch = await request(app)
      .get("/api/products/storefront")
      .query({ search: "[.*]" });
    expect(escapedSearch.status).toBe(200);
    expect(escapedSearch.body.total).toBe(0);

    const farmerIdSearch = await request(app)
      .get("/api/products/mine")
      .set("Authorization", `Bearer ${farmerToken}`)
      .query({ search: String(productId) });
    expect(farmerIdSearch.status).toBe(200);
    expect(farmerIdSearch.body.items.map((item) => item._id)).toContain(String(productId));
  });

  it("searches customer orders with product names and IDs before pagination while preserving customer scope", async () => {
    const nameSearch = await request(app)
      .get("/api/orders/mine")
      .set("Authorization", `Bearer ${customerToken}`)
      .query({ search: "pure natural honey", status: "Pending", limit: 1, page: 1, from: orderDate, to: orderDate });
    expect(nameSearch.status).toBe(200);
    expect(nameSearch.body.total).toBe(2);
    expect(nameSearch.body.pages).toBe(2);

    const idSearch = await request(app)
      .get("/api/orders/mine")
      .set("Authorization", `Bearer ${customerToken}`)
      .query({ search: String(productId) });
    expect(idSearch.status).toBe(200);
    expect(idSearch.body.total).toBe(2);

    const otherCustomerSearch = await request(app)
      .get("/api/orders/mine")
      .set("Authorization", `Bearer ${otherCustomerToken}`)
      .query({ search: String(productId) });
    expect(otherCustomerSearch.status).toBe(200);
    expect(otherCustomerSearch.body.total).toBe(0);
  });

  it("searches admin orders by product, customer, order, status, and payment and combines date/status filters", async () => {
    for (const search of ["pure natural honey", String(productId), String(orderId), "GM-SEARCH-1001", "Search Customer", "Order Placed", "UPI"]) {
      const response = await request(app)
        .get("/api/orders/admin/all")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ search, limit: 10, page: 1 });
      expect(response.status).toBe(200);
      expect(response.body.items.map((item) => item._id)).toContain(String(orderId));
    }

    const filtered = await request(app)
      .get("/api/orders/admin/all")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ search: "pure natural honey", status: "Order Placed", from: orderDate, to: orderDate, limit: 1, page: 1 });
    expect(filtered.status).toBe(200);
    expect(filtered.body.total).toBe(2);
    expect(filtered.body.pages).toBe(2);
    expect(filtered.body.statusCounts["Order Placed"]).toBe(2);
  });

  it("restricts farmer product matching to products in that farmer's own order items", async () => {
    const farmerProductId = await request(app)
      .get("/api/orders/farmer")
      .set("Authorization", `Bearer ${farmerToken}`)
      .query({ search: String(productId), status: "Pending", from: orderDate, to: orderDate, limit: 1, page: 1 });
    expect(farmerProductId.status).toBe(200);
    expect(farmerProductId.body.total).toBe(2);
    expect(farmerProductId.body.pages).toBe(2);

    const farmerOwnProduct = await request(app)
      .get("/api/orders/farmer")
      .set("Authorization", `Bearer ${farmerToken}`)
      .query({ search: "Blueberry", limit: 10, page: 1 });
    expect(farmerOwnProduct.status).toBe(200);
    expect(farmerOwnProduct.body.total).toBe(0);

    const otherFarmerProduct = await request(app)
      .get("/api/orders/farmer")
      .set("Authorization", `Bearer ${otherFarmerToken}`)
      .query({ search: "Blueberry", limit: 10, page: 1 });
    expect(otherFarmerProduct.status).toBe(200);
    expect(otherFarmerProduct.body.total).toBe(1);
    expect(otherFarmerProduct.body.items[0].items).toHaveLength(1);
    expect(otherFarmerProduct.body.items[0].items[0].name).toBe("Blueberry Basket");
  });

  it("preserves historical Product IDs in customer, farmer, and admin order lists when products are missing", async () => {
    const customer = await User.findOne({ email: "search.customer@example.test" });
    const farmer = await User.findOne({ email: "search.farmer@example.test" });
    const archivedProductId = new mongoose.Types.ObjectId();
    await Order.create({
      orderNumber: "GM-SEARCH-ARCHIVED",
      user: customer._id,
      items: [{
        product: archivedProductId,
        name: "Archived Product Snapshot",
        price: 25,
        quantity: 1,
        farmer: farmer._id,
      }],
      status: "Delivered",
      paymentStatus: "Paid",
      total: 25,
    });

    const customerOrders = await request(app)
      .get("/api/orders/mine")
      .set("Authorization", `Bearer ${customerToken}`)
      .query({ search: "Archived Product Snapshot" });
    const farmerOrders = await request(app)
      .get("/api/orders/farmer")
      .set("Authorization", `Bearer ${farmerToken}`)
      .query({ search: "Archived Product Snapshot" });
    const adminOrders = await request(app)
      .get("/api/orders/admin/all")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ search: "Archived Product Snapshot" });

    expect(customerOrders.status).toBe(200);
    expect(farmerOrders.status).toBe(200);
    expect(adminOrders.status).toBe(200);
    expect(String(customerOrders.body.items[0].items[0].product)).toBe(String(archivedProductId));
    expect(String(farmerOrders.body.items[0].items[0].product)).toBe(String(archivedProductId));
    expect(String(adminOrders.body.items[0].items[0].product)).toBe(String(archivedProductId));
  });
});
