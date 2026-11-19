// @ts-nocheck
const request = require("supertest");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");

describe("Order location update authorization", () => {
  let customerToken, farmerToken, otherFarmerToken, adminToken;
  let customerId, farmerId, otherFarmerId, adminId, productId, orderId;

  beforeAll(async () => await connectDB());
  afterAll(async () => await disconnectDB());

  beforeAll(async () => {
    // Create users
    const customer = await User.create({
      name: "Location Customer",
      email: "loc.customer@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "customer",
    });
    const farmer = await User.create({
      name: "Location Farmer",
      email: "loc.farmer@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "farmer",
      farmerApproved: true,
    });
    const otherFarmer = await User.create({
      name: "Other Farmer",
      email: "other.farmer@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "farmer",
      farmerApproved: true,
    });
    const admin = await User.create({
      name: "Location Admin",
      email: "loc.admin@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "admin",
    });
    await FarmerProfile.create({
      user: farmer._id,
      farmName: "Location Farm",
      certification: { verifiedByAdmin: true },
    });
    await FarmerProfile.create({
      user: otherFarmer._id,
      farmName: "Other Farm",
      certification: { verifiedByAdmin: true },
    });
    customerId = customer._id;
    farmerId = farmer._id;
    otherFarmerId = otherFarmer._id;
    adminId = admin._id;

    // Create product owned by farmer
    const product = await Product.create({
      name: "Test Product",
      description: "Test product for location update tests",
      price: 100,
      category: "Vegetables",
      farmer: farmer._id,
      stock: 10,
    });
    productId = product._id;

    // Create order with items belonging to the farmer
    const order = await Order.create({
      orderNumber: "GM-LOC001",
      user: customer._id,
      items: [
        {
          product: product._id,
          name: "Test Product",
          price: 100,
          quantity: 2,
          farmer: farmer._id,
        },
      ],
      address: {
        name: "Location Customer",
        line1: "123 Test Street",
        city: "Test City",
        phone: "9876543210",
      },
      status: "Out for Delivery",
      subtotal: 200,
      total: 230,
    });
    orderId = order._id;

    // Login tokens
    const customerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: customer.email, password: "demo-password" });
    customerToken = customerRes.body.token;

    const farmerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: farmer.email, password: "demo-password" });
    farmerToken = farmerRes.body.token;

    const otherFarmerRes = await request(app)
      .post("/api/auth/login")
      .send({ email: otherFarmer.email, password: "demo-password" });
    otherFarmerToken = otherFarmerRes.body.token;

    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: admin.email, password: "demo-password" });
    adminToken = adminRes.body.token;
  });

  it("allows authorized farmer to update delivery location for their order", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/location`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 12.97, lng: 77.59 });
    expect(res.status).toBe(200);
    expect(res.body._id.toString()).toBe(orderId.toString());
  });

  it("accepts any coordinates (no backend range validation)", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/location`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 91, lng: 77.59 });
    expect(res.status).toBe(200);
  });

  it("rejects unrelated farmer from updating another farmer's order location", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/location`)
      .set("Authorization", `Bearer ${otherFarmerToken}`)
      .send({ lat: 12.97, lng: 77.59 });
    expect(res.status).toBe(403);
  });

  it("rejects customer from updating farmer location", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/location`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ lat: 12.97, lng: 77.59 });
    expect(res.status).toBe(403);
  });

  it("allows admin to update location and returns currentLocation", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/location`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ lat: 13.0, lng: 77.6 });
    expect(res.status).toBe(200);
    expect(res.body.currentLocation.lat).toBe(13.0);
    expect(res.body.currentLocation.lng).toBe(77.6);
  });

  it("returns 404 for non-existent order", async () => {
    const res = await request(app)
      .patch("/api/orders/000000000000000000000000/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 12.97, lng: 77.59 });
    expect(res.status).toBe(404);
  });

  it("persists updatedAt timestamp with location (via admin response)", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/location`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ lat: 14.5, lng: 76.5 });
    expect(res.status).toBe(200);
    expect(res.body.currentLocation.updatedAt).toBeDefined();
  });
});
