// @ts-nocheck
const request = require("supertest");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");

const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");

beforeAll(async () => await connectDB());
afterAll(async () => await disconnectDB());

let customerToken, farmerToken, customerId, farmerId, productId, orderId;
let otherCustomerToken;

beforeAll(async () => {
  // Create users directly in the DB
  const customer = await User.create({
    name: "Harshita Patil",
    email: "harshita.order@demo.greenmart.test",
    passwordHash: await require("bcryptjs").hash("demo-password", 10),
    role: "customer",
  });
  const farmer = await User.create({
    name: "Ramesh Gouda",
    email: "ramesh.order@demo.greenmart.test",
    passwordHash: await require("bcryptjs").hash("demo-password", 10),
    role: "farmer",
  });
  const otherCustomer = await User.create({
    name: "Another Customer",
    email: "another.customer@demo.greenmart.test",
    passwordHash: await require("bcryptjs").hash("demo-password", 10),
    role: "customer",
  });
  await FarmerProfile.create({
    user: farmer._id,
    farmName: "Ramesh Farm",
    certification: { verifiedByAdmin: true },
  });
  customerId = customer._id;
  farmerId = farmer._id;

  // Login as customer
  const cRes = await request(app)
    .post("/api/auth/login")
    .send({ email: customer.email, password: "demo-password" });
  customerToken = cRes.body.token;
  const otherCustomerLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: otherCustomer.email, password: "demo-password" });
  otherCustomerToken = otherCustomerLogin.body.token;

  // Login as farmer
  const fRes = await request(app)
    .post("/api/auth/login")
    .send({ email: farmer.email, password: "demo-password" });
  farmerToken = fRes.body.token;

  // Create a product owned by the farmer
  const product = await Product.create({
    name: "Organic Tomatoes",
    description: "Fresh organic tomatoes",
    category: "Vegetables",
    price: 40,
    unit: "kg",
    stock: 100,
    farmer: farmerId,
  });
  productId = product._id;
});

describe("End-to-end order workflow", () => {
  it("customer adds product to cart", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].quantity).toBe(2);
  });

  it("customer creates an order", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        address: { name: "Harshita Patil", line1: "123 Farm Road", city: "Gadag", phone: "9876543210" },
        coordinates: { lat: 15.4, lng: 75.6 },
        paymentMethod: "UPI",
      });
    expect(res.status).toBe(201);
    expect(res.body.orderNumber).toBeDefined();
    expect(res.body.status).toBe("Order Placed");
    expect(res.body.items[0].farmer.toString()).toBe(farmerId.toString());
    orderId = res.body._id;
  });

  it("customer sees their order in 'mine'", async () => {
    const res = await request(app)
      .get("/api/orders/mine")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]._id).toBe(orderId);
  });

  it("rejects unauthenticated requests and prevents customers from reading another customer's order", async () => {
    const unauthenticated = await request(app).get(`/api/orders/${orderId}`);
    const otherCustomer = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${otherCustomerToken}`);

    expect(unauthenticated.status).toBe(401);
    expect(otherCustomer.status).toBe(403);
  });

  it("farmer can see orders for their products", async () => {
    const res = await request(app)
      .get("/api/orders/farmer")
      .set("Authorization", `Bearer ${farmerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((o) => o._id === orderId)).toBe(true);
  });

  it("farmer updates order status to 'Packed'", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ status: "Packed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Packed");
  });

  it("customer sees updated status", async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Packed");
  });

  it("customer cannot update order status (forbidden)", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ status: "Delivered" });
    expect(res.status).toBe(403);
  });

  it("farmer updates order status to 'Delivered'", async () => {
    const packed = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ status: "Out for Delivery" });
    expect(packed.status).toBe(200);
    expect(packed.body.status).toBe("Out for Delivery");

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ status: "Delivered" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Delivered");
  });

  it("enforces sequential transitions and prevents delivered orders from going backwards", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ status: "Packed" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/cannot change/i);
  });

  it("tracks fulfillment separately for each farmer and requires a failure reason", async () => {
    const secondFarmer = await User.create({
      name: "Second Farmer",
      email: "second.order@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "farmer",
    });
    await FarmerProfile.create({
      user: secondFarmer._id,
      farmName: "Second Farm",
      certification: { verifiedByAdmin: true },
    });
    const secondLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: secondFarmer.email, password: "demo-password" });
    const outsider = await User.create({
      name: "Unrelated Farmer",
      email: "unrelated.order@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "farmer",
    });
    await FarmerProfile.create({
      user: outsider._id,
      farmName: "Unrelated Farm",
      certification: { verifiedByAdmin: true },
    });
    const outsiderLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: outsider.email, password: "demo-password" });
    const order = await Order.create({
      orderNumber: "GM-MULTI-FARMER",
      user: customerId,
      items: [
        { product: productId, name: "Farmer A item", price: 40, quantity: 1, farmer: farmerId, fulfillmentStatus: "Order Placed" },
        { product: productId, name: "Farmer B item", price: 25, quantity: 1, farmer: secondFarmer._id, fulfillmentStatus: "Order Placed" },
      ],
      status: "Order Placed",
      statusHistory: [{ status: "Order Placed" }],
      subtotal: 65,
      total: 95,
    });

    const updateAsFarmerA = (status, reason) => request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ status, reason });
    const packed = await updateAsFarmerA("Packed");
    expect(packed.status).toBe(200);
    expect(packed.body.status).toBe("Packed");
    const afterOneFarmer = await Order.findById(order._id);
    expect(afterOneFarmer.items[0].fulfillmentStatus).toBe("Packed");
    expect(afterOneFarmer.items[1].fulfillmentStatus).toBe("Order Placed");
    expect(afterOneFarmer.status).toBe("Order Placed");

    const outForDelivery = await updateAsFarmerA("Out for Delivery");
    expect(outForDelivery.status).toBe(200);
    const missingReason = await updateAsFarmerA("Delivery Failed");
    expect(missingReason.status).toBe(400);
    const failed = await updateAsFarmerA("Delivery Failed", "Customer not available");
    expect(failed.status).toBe(200);
    expect(failed.body.items[0].deliveryFailureReason).toBe("Customer not available");

    const unauthorized = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${outsiderLogin.body.token}`)
      .send({ status: "Packed" });
    expect(unauthorized.status).toBe(403);

    await updateAsFarmerA("Out for Delivery");
    const deliveredA = await updateAsFarmerA("Delivered");
    expect(deliveredA.body.status).toBe("Delivered");
    const customerView = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(customerView.body.status).toBe("Order Placed");
    expect(customerView.body.items[0].fulfillmentStatus).toBe("Delivered");
    expect(customerView.body.items[1].fulfillmentStatus).toBe("Order Placed");

    const updateAsFarmerB = (status) => request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${secondLogin.body.token}`)
      .send({ status });
    expect((await updateAsFarmerB("Packed")).status).toBe(200);
    expect((await updateAsFarmerB("Out for Delivery")).status).toBe(200);
    const deliveredAll = await updateAsFarmerB("Delivered");
    expect(deliveredAll.body.status).toBe("Delivered");
    expect((await Order.findById(order._id)).status).toBe("Delivered");

    const customerUpdate = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${outsiderLogin.body.token}`)
      .send({ status: "Packed" });
    expect(customerUpdate.status).toBe(403);
    expect(secondLogin.body.token).toBeDefined();
    expect(outsiderLogin.body.token).toBeDefined();
  });

  it("product stock is reduced after order", async () => {
    const product = await Product.findById(productId);
    expect(product.stock).toBe(98); // 100 - 2
  });
});
