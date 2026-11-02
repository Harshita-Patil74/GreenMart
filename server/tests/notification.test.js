const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const Notification = require("../src/models/Notification");
const Product = require("../src/models/Product");
const Wishlist = require("../src/models/Wishlist");
const FarmerProfile = require("../src/models/FarmerProfile");
const { EVENT_KEY_PREFIXES } = require("../src/services/notificationService");

let adminToken, adminId, farmerToken, farmerId, customerToken, customerId;

beforeAll(async () => await connectDB());
afterAll(async () => await disconnectDB());

async function createUser(role, emailSuffix) {
  const passwordHash = await bcrypt.hash("ValidPass1!", 10);
  const email = `test.${role}.${emailSuffix}@greenmart.test`;
  await User.deleteOne({ email });
  const user = await User.create({
    name: `Test ${role}`,
    email,
    passwordHash,
    role,
  });
  if (role === "farmer") {
    await FarmerProfile.create({ user: user._id, farmName: "Test Farm", certification: { verifiedByAdmin: true } });
  }
  return user;
}

async function login(email, password = "ValidPass1!") {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.token;
}

describe("Notification system", () => {
  beforeEach(async () => {
    await Notification.deleteMany({});
    const admin = await createUser("admin", "admin");
    adminId = admin._id;
    adminToken = await login(admin.email);
    const farmer = await createUser("farmer", "farmer");
    farmerId = farmer._id;
    farmerToken = await login(farmer.email);
    const customer = await createUser("customer", "customer");
    customerId = customer._id;
    customerToken = await login(customer.email);
  });

  describe("Notification model fields", () => {
    it("stores actionUrl, readAt, priority, icon, eventKey fields", async () => {
      const n = await Notification.create({
        user: customerId,
        type: "backInStock",
        category: "inventory",
        title: "Product back in stock",
        message: "Item available again.",
        icon: "PackageCheck",
        priority: "normal",
        actionUrl: "/product/abc",
        eventKey: "product:back-in-stock:abc:customer",
        resourceType: "Product",
        resourceId: new (require("mongoose")).Types.ObjectId(),
      });
      expect(n.icon).toBe("PackageCheck");
      expect(n.priority).toBe("normal");
      expect(n.actionUrl).toBe("/product/abc");
      expect(n.eventKey).toBe("product:back-in-stock:abc:customer");
      expect(n.isRead).toBe(false);
      expect(n.readAt).toBeUndefined();
      expect(n.createdAt).toBeDefined();
    });
  });

  describe("Notification list API", () => {
    it("returns only the authenticated user's notifications", async () => {
      await Notification.create({ user: customerId, type: "orderConfirmation", category: "orders", title: "Customer order", message: "msg" });
      await Notification.create({ user: farmerId, type: "newOrderFarmer", category: "orders", title: "Farmer order", message: "msg" });

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    const body = Array.isArray(res.body) ? res.body : res.body.items;
    expect(body.length).toBe(1);
    expect(body[0].title).toBe("Customer order");
    });

    it("filters by category", async () => {
      await Notification.create({ user: adminId, type: "newOrderAdmin", category: "orders", title: "Order", message: "msg" });
      await Notification.create({ user: adminId, type: "newProductAdmin", category: "products", title: "Product", message: "msg" });

      const res = await request(app)
        .get("/api/notifications?category=orders")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const body = Array.isArray(res.body) ? res.body : res.body.items;
      expect(body.length).toBe(1);
      expect(body[0].category).toBe("orders");
    });

    it("paginates results", async () => {
      for (let i = 0; i < 25; i++) {
        await Notification.create({ user: adminId, type: "newOrderAdmin", category: "orders", title: `Order ${i}`, message: "msg" });
      }
      const res = await request(app)
        .get("/api/notifications?page=2&limit=10")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(10);
      expect(res.body.total).toBe(25);
      expect(res.body.pages).toBe(3);
    });
  });

  describe("Mark read / mark all read / delete", () => {
    it("marks one notification as read with readAt timestamp", async () => {
      const n = await Notification.create({ user: customerId, type: "orderConfirmation", category: "orders", title: "Order", message: "msg" });
      const res = await request(app)
        .patch(`/api/notifications/${n._id}/read`)
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      const updated = await Notification.findById(n._id);
      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeInstanceOf(Date);
    });

    it("marks all notifications as read", async () => {
      await Notification.create({ user: customerId, type: "orderConfirmation", category: "orders", title: "O1", message: "msg" });
      await Notification.create({ user: customerId, type: "orderConfirmation", category: "orders", title: "O2", message: "msg" });
      const res = await request(app)
        .patch("/api/notifications/read-all")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      const count = await Notification.countDocuments({ user: customerId, isRead: false });
      expect(count).toBe(0);
    });

    it("deletes an individual notification", async () => {
      const n = await Notification.create({ user: customerId, type: "orderConfirmation", category: "orders", title: "Order", message: "msg" });
      const res = await request(app)
        .delete(`/api/notifications/${n._id}`)
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      const exists = await Notification.findById(n._id);
      expect(exists).toBeNull();
    });

    it("prevents accessing another user's notifications", async () => {
      const n = await Notification.create({ user: farmerId, type: "newOrderFarmer", category: "orders", title: "Farmer order", message: "msg" });
      const res = await request(app)
        .patch(`/api/notifications/${n._id}/read`)
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("Deduplication via eventKey", () => {
    it("does not create duplicate notifications with same eventKey", async () => {
      const eventKey = `${EVENT_KEY_PREFIXES.stockAlert}:product-1`;
      await Notification.create({ user: adminId, type: "stockAlert", category: "inventory", title: "Low stock", message: "msg", eventKey });
      await createNotificationViaAPI(adminId, "stockAlert", "inventory", "Low stock", "msg", eventKey);
      const count = await Notification.countDocuments({ user: adminId, eventKey });
      expect(count).toBe(1);
    });
  });

  describe("Customer registration notification", () => {
    it("notifies admins when a customer registers", async () => {
      await request(app)
        .post("/api/auth/register")
        .send({ name: "New Customer", email: "newcustomer@greenmart.test", password: "StrongPass1!", role: "customer" });
      const notifications = await Notification.find({ type: "customerRegisteredAdmin" });
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].category).toBe("farmers");
      expect(notifications[0].title).toBe("New customer registered");
    });
  });

  describe("Wishlist back-in-stock notification", () => {
    it("notifies wishlist customers when out-of-stock product is restocked", async () => {
      const product = await Product.create({
        name: "Test Fig",
        description: "Fresh figs",
        category: "Fruits",
        price: 100,
        unit: "kg",
        stock: 0,
        farmer: farmerId,
        images: [],
      });
      await Wishlist.create({ user: customerId, products: [product._id] });

      await request(app)
        .put(`/api/products/${product._id}`)
        .set("Authorization", `Bearer ${farmerToken}`)
        .send({ stock: 10, name: "Test Fig", description: "Fresh figs", category: "Fruits", price: 100, unit: "kg" });

      const notifications = await Notification.find({ type: "backInStock", user: customerId });
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].title).toBe("Product back in stock");
    });
  });
});

async function createNotificationViaAPI(userId, type, category, title, message, eventKey) {
  const { createNotification } = require("../src/services/notificationService");
  return createNotification({ userId, type, category, title, message, eventKey });
}
