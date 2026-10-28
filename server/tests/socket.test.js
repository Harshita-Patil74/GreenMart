// @ts-nocheck
const http = require("http");
const { Server } = require("socket.io");
const { io: ioClient } = require("socket.io-client");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../src/app");
const jwt = require("jsonwebtoken");
const env = require("../src/config/env");

const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");

let mongod, server, io, socketClient, customerToken, farmerToken, orderId, productId, customerId, farmerId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Create users
  const customer = await User.create({
    name: "Socket Customer",
    email: "socket.customer@demo.test",
    passwordHash: await bcrypt.hash("demo-password", 10),
    role: "customer",
  });
  const farmer = await User.create({
    name: "Socket Farmer",
    email: "socket.farmer@demo.test",
    passwordHash: await bcrypt.hash("demo-password", 10),
    role: "farmer",
  });
  await FarmerProfile.create({
    user: farmer._id,
    farmName: "Socket Farm",
    certification: { verifiedByAdmin: true },
  });
  customerId = customer._id;
  farmerId = farmer._id;

  // Generate JWT tokens
  customerToken = jwt.sign({ id: customerId, role: "customer" }, env.jwtSecret, { expiresIn: "7d" });
  farmerToken = jwt.sign({ id: farmerId, role: "farmer" }, env.jwtSecret, { expiresIn: "7d" });

  // Create a product
  const product = await Product.create({
    name: "Socket Test Product",
    description: "Test product for socket",
    category: "Vegetables",
    price: 50,
    unit: "kg",
    stock: 100,
    farmer: farmerId,
  });
  productId = product._id;

  // Create order via direct DB insert
  const order = await Order.create({
    orderNumber: "SOCKET-001",
    user: customerId,
    items: [
      {
        product: productId,
        name: "Socket Test Product",
        price: 50,
        quantity: 2,
        farmer: farmerId,
      },
    ],
    address: { name: "Test", line1: "1 Test St", city: "Gadag", phone: "1234567890" },
    coordinates: { lat: 15.4, lng: 75.6 },
    paymentMethod: "COD",
    status: "Order Placed",
    statusHistory: [{ status: "Order Placed", at: new Date() }],
    subtotal: 100,
    deliveryCharge: 30,
    total: 130,
  });
  orderId = order._id;

  // Start server with socket.io
  server = http.createServer(app);
  io = new Server(server, {
    cors: { origin: env.clientUrl, credentials: true },
  });
  require("../src/sockets")(io);
  require("../src/sockets/emitters").setIO(io);
  await new Promise((resolve) => server.listen(0, resolve));
});

afterAll(async () => {
  if (socketClient) socketClient.disconnect();
  if (io) io.close();
  if (server) server.close();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const client = ioClient(`http://localhost:${server.address().port}`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    client.on("connect", () => resolve(client));
    client.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("Socket connection timeout")), 10000);
  });
}

describe("Socket.io real-time updates", () => {
  it("customer connects and receives order status update when farmer updates status", async () => {
    socketClient = await connectSocket(customerToken);

    const statusPromise = new Promise((resolve) => {
      socketClient.once("order:statusUpdated", (data) => resolve(data));
    });

    // Farmer updates order status via API
    const res = await fetch(`http://localhost:${server.address().port}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${farmerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "Packed" }),
    });
    expect(res.status).toBe(200);

    const data = await statusPromise;
    expect(data.status).toBe("Packed");
  });

  it("customer receives order location update", async () => {
    const locationPromise = new Promise((resolve) => {
      socketClient.once("order:locationUpdated", (data) => resolve(data));
    });

    await fetch(`http://localhost:${server.address().port}/api/orders/${orderId}/location`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${farmerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lat: 15.45, lng: 75.65, estimatedDelivery: new Date().toISOString() }),
    });

    const data = await locationPromise;
    expect(data.currentLocation.lat).toBe(15.45);
    expect(data.currentLocation.lng).toBe(75.65);
  });

  it("rejects socket connection without valid token", async () => {
    await expect(connectSocket("invalid-token")).rejects.toThrow();
  });

  it("does not grant farmer socket rooms from a client-supplied JWT role claim", async () => {
    const forgedRoleToken = jwt.sign({ id: customerId, role: "farmer" }, env.jwtSecret, { expiresIn: "7d" });
    const forgedSocket = await connectSocket(forgedRoleToken);
    const serverSocket = io.sockets.sockets.get(forgedSocket.id);

    expect(serverSocket.rooms.has(`farmer:${customerId}`)).toBe(false);
    expect(serverSocket.rooms.has("admins")).toBe(false);
    forgedSocket.disconnect();
  });

  it("farmer receives new order notification when customer creates order", async () => {
    // Connect a farmer socket
    const farmerSocket = await connectSocket(farmerToken);

    const orderPromise = new Promise((resolve) => {
      farmerSocket.once("order:created", (data) => resolve(data));
    });

    // Add product to cart first
    await fetch(`http://localhost:${server.address().port}/api/cart/items`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, quantity: 1 }),
    });

    // Create a new order via API as customer
    const res = await fetch(`http://localhost:${server.address().port}/api/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: { name: "Socket Customer", line1: "2 Test St", city: "Gadag", phone: "1234567890" },
        coordinates: { lat: 15.5, lng: 75.7 },
        paymentMethod: "UPI",
      }),
    });
    expect(res.status).toBe(201);

    const data = await orderPromise;
    expect(data.orderNumber).toBeDefined();

    farmerSocket.disconnect();
  });
});
