const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const Address = require("../src/models/Address");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");

let customerToken, farmerToken, customerId, farmerId, productId, orderId;
let originalFetch;
let customerAddressId;

const CUSTOMER_COORDS = { lat: 1, lng: 1 };
const FARMER_COORDS = { lat: 1.02, lng: 1.02 };

beforeAll(async () => {
  await connectDB();

  const customer = await User.create({
    name: "Reviewer",
    email: "reviewer@demo.greenmart.test",
    passwordHash: await bcrypt.hash("demo-password", 10),
    role: "customer",
  });
  const farmer = await User.create({
    name: "Review Farmer",
    email: "reviewfarmer@demo.greenmart.test",
    passwordHash: await bcrypt.hash("demo-password", 10),
    role: "farmer",
  });
  await FarmerProfile.create({
    user: farmer._id,
    farmName: "Review Farm",
    location: FARMER_COORDS,
    certification: { verifiedByAdmin: true },
  });
  customerId = customer._id;
  farmerId = farmer._id;

  const address = await Address.create({
    user: customer._id,
    name: "R",
    line1: "1",
    city: "Gadag",
    phone: "1",
    coordinates: CUSTOMER_COORDS,
  });
  customerAddressId = address._id;

  // Deterministic OSRM mock (~2.5 km, within the 5 km standard tier).
  // Non-OSRM URLs pass through to the real fetch (with init options).
  originalFetch = global.fetch;
  global.fetch = jest.fn(async (url, init) => {
    const u = String(url);
    if (u.includes("/route/v1/driving/")) {
      const m = u.match(/route\/v1\/driving\/([\d.-]+,[\d.-]+);([\d.-]+,[\d.-]+)/);
      if (!m) {
        return { ok: false, status: 400, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ routes: [{ distance: 2500 }] }) };
    }
    return originalFetch(url, init);
  });

  const cRes = await request(app).post("/api/auth/login").send({ email: customer.email, password: "demo-password" });
  customerToken = cRes.body.token;
  const fRes = await request(app).post("/api/auth/login").send({ email: farmer.email, password: "demo-password" });
  farmerToken = fRes.body.token;

  const product = await Product.create({
    name: "Organic Carrots",
    description: "Fresh organic carrots",
    category: "Vegetables",
    price: 35,
    unit: "kg",
    stock: 50,
    farmer: farmerId,
  });
  productId = product._id;

  // Add to cart and create order
  await request(app).post("/api/cart/items").set("Authorization", `Bearer ${customerToken}`).send({ productId, quantity: 2 });
  const quoteRes = await request(app)
    .post("/api/orders/quote")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ addressId: customerAddressId });
  const quoteVersion = quoteRes.body.quoteVersion;
  const orderRes = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ address: { name: "R", line1: "1", city: "Gadag", phone: "1" }, addressId: customerAddressId, coordinates: CUSTOMER_COORDS, paymentMethod: "COD", quoteVersion });
  orderId = orderRes.body._id;

  // Deliver the order so review is allowed
  await request(app).patch(`/api/orders/${orderId}/status`).set("Authorization", `Bearer ${farmerToken}`).send({ status: "Packed" });
  await request(app).patch(`/api/orders/${orderId}/status`).set("Authorization", `Bearer ${farmerToken}`).send({ status: "Out for Delivery" });
  await request(app).patch(`/api/orders/${orderId}/status`).set("Authorization", `Bearer ${farmerToken}`).send({ status: "Delivered" });
});

afterAll(async () => {
  global.fetch = originalFetch;
  await disconnectDB();
});

describe("Review workflow", () => {
  it("customer creates a review for a delivered product", async () => {
    const res = await request(app)
      .post(`/api/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ rating: 5, comment: "Excellent produce!" });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    expect(res.body.comment).toBe("Excellent produce!");
  });

  it("lists reviews for the product", async () => {
    const res = await request(app).get(`/api/products/${productId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0].rating).toBe(5);
  });

  it("updates product rating average after review", async () => {
    const product = await Product.findById(productId);
    expect(product.ratingCount).toBe(1);
    expect(product.ratingAverage).toBe(5);
  });

  it("rejects review from non-customer", async () => {
    const res = await request(app)
      .post(`/api/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ rating: 1, comment: "Spam" });
    expect(res.status).toBe(403);
  });
});
