const request = require("supertest");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");

let farmerToken;
let otherFarmerToken;
let outsiderFarmerToken;
let unapprovedFarmerToken;
let customerToken;
let farmerId;
let orderId;
let productId;
let uploadedImagePath;

beforeAll(async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash("ValidPass1!", 10);
  const farmer = await User.create({
    name: "Farmer One",
    email: "farmer.one@gmail.com",
    passwordHash,
    role: "farmer",
  });
  const otherFarmer = await User.create({
    name: "Farmer Two",
    email: "farmer.two@gmail.com",
    passwordHash,
    role: "farmer",
  });
  const outsiderFarmer = await User.create({
    name: "Farmer Three",
    email: "farmer.three@gmail.com",
    passwordHash,
    role: "farmer",
  });
  const unapprovedFarmer = await User.create({
    name: "Unapproved Farmer",
    email: "farmer.pending@gmail.com",
    passwordHash,
    role: "farmer",
  });
  const customer = await User.create({
    name: "Customer",
    email: "customer@gmail.com",
    passwordHash,
    role: "customer",
  });
  farmerId = farmer._id;
  const otherFarmerId = otherFarmer._id;
  const outsiderFarmerId = outsiderFarmer._id;
  await FarmerProfile.create([
    { user: farmer._id, farmName: "Farmer One Farm", certification: { verifiedByAdmin: true } },
    { user: otherFarmerId, farmName: "Farmer Two Farm", certification: { verifiedByAdmin: true } },
    { user: outsiderFarmerId, farmName: "Farmer Three Farm", certification: { verifiedByAdmin: true } },
    { user: unapprovedFarmer._id, farmName: "Pending Farm", certification: { verifiedByAdmin: false } },
  ]);
  const customerId = customer._id;
  const products = await Product.create([
    { name: "Farmer One crop", category: "Vegetables", price: 2, farmer: farmer._id },
    { name: "Farmer Two crop", category: "Vegetables", price: 3, farmer: otherFarmer._id },
    { name: "Unavailable crop", category: "Vegetables", price: 4, farmer: otherFarmer._id, status: "Inactive" },
  ]);
  productId = products[0]._id;
  const order = await Order.create({
    orderNumber: "GM-FARMER-SCOPE-1",
    user: customerId,
    items: [
      { name: "Farmer One crop", product: (await Product.findOne({ name: "Farmer One crop" }))._id, price: 10, quantity: 2, farmer: farmerId },
      { name: "Farmer Two crop", product: (await Product.findOne({ name: "Farmer Two crop" }))._id, price: 20, quantity: 1, farmer: otherFarmerId },
    ],
    address: { name: "Test Customer", line1: "Private road 1", city: "Test city", phone: "555-0100" },
    subtotal: 40,
    total: 55,
  });
  orderId = order._id;

  const [farmerLogin, otherFarmerLogin, outsiderFarmerLogin, unapprovedFarmerLogin, customerLogin] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: farmer.email, password: "ValidPass1!" }),
    request(app).post("/api/auth/login").send({ email: otherFarmer.email, password: "ValidPass1!" }),
    request(app).post("/api/auth/login").send({ email: outsiderFarmer.email, password: "ValidPass1!" }),
    request(app).post("/api/auth/login").send({ email: unapprovedFarmer.email, password: "ValidPass1!" }),
    request(app).post("/api/auth/login").send({ email: customer.email, password: "ValidPass1!" }),
  ]);
  farmerToken = farmerLogin.body.token;
  otherFarmerToken = otherFarmerLogin.body.token;
  outsiderFarmerToken = outsiderFarmerLogin.body.token;
  unapprovedFarmerToken = unapprovedFarmerLogin.body.token;
  customerToken = customerLogin.body.token;
});

afterAll(async () => {
  await disconnectDB();
  if (uploadedImagePath) {
    const imagePath = path.join(__dirname, "..", "uploads", "products", path.basename(uploadedImagePath));
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }
});

describe("Product availability and farmer data", () => {
  it("does not expose inactive products in the customer storefront", async () => {
    const response = await request(app).get("/api/products/storefront");

    expect(response.status).toBe(200);
    expect(response.body.items.map((product) => product.name)).not.toContain("Unavailable crop");
  });

  it("keeps the legacy product list available to the admin catalog", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body.items.map((product) => product.name)).toContain("Unavailable crop");
  });

  it("returns only products belonging to the authenticated farmer", async () => {
    const response = await request(app)
      .get("/api/products/mine")
      .set("Authorization", `Bearer ${farmerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe("Farmer One crop");
    expect(String(response.body[0].farmer)).toBe(String(farmerId));
  });

  it("requires an authenticated farmer", async () => {
    const unauthenticated = await request(app).get("/api/products/mine");
    const customer = await request(app)
      .get("/api/products/mine")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(unauthenticated.status).toBe(401);
    expect(customer.status).toBe(403);
  });

  it("rejects forged role fields and blocks unapproved farmers from management APIs", async () => {
    const forgedCustomer = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Forged product", category: "Vegetables", price: 1, role: "farmer" });
    const unapprovedProducts = await request(app)
      .get("/api/products/mine")
      .set("Authorization", `Bearer ${unapprovedFarmerToken}`);
    const unapprovedOrders = await request(app)
      .get("/api/orders/farmer")
      .set("Authorization", `Bearer ${unapprovedFarmerToken}`);
    const unapprovedProfileUpdate = await request(app)
      .put("/api/farmers/me")
      .set("Authorization", `Bearer ${unapprovedFarmerToken}`)
      .send({ farmName: "Changed before approval" });
    const customerLocationUpdate = await request(app)
      .put("/api/locations/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ lat: 1, lng: 1 });
    const unapprovedLocationUpdate = await request(app)
      .put("/api/locations/me")
      .set("Authorization", `Bearer ${unapprovedFarmerToken}`)
      .send({ lat: 1, lng: 1 });

    expect(forgedCustomer.status).toBe(403);
    expect(unapprovedProducts.status).toBe(403);
    expect(unapprovedOrders.status).toBe(403);
    expect(unapprovedProfileUpdate.status).toBe(403);
    expect(customerLocationUpdate.status).toBe(403);
    expect(unapprovedLocationUpdate.status).toBe(403);
  });

  it("allows the owner to toggle availability using the existing update endpoint", async () => {
    const response = await request(app)
      .put(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .field("status", "Inactive");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("Inactive");
  });

  it("stores uploaded product images and serves them from the uploads endpoint", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${farmerToken}`)
      .field("name", "Uploaded image crop")
      .field("category", "Vegetables")
      .field("price", "12")
      .field("unit", "kg")
      .field("stock", "5")
      .attach("images", Buffer.from("89504e470d0a1a0a", "hex"), {
        filename: "uploaded-crop.png",
        contentType: "image/png",
      });

    uploadedImagePath = response.body.images?.[0];
    expect(response.status).toBe(201);
    expect(response.body.images).toHaveLength(1);
    expect(response.body.images[0]).toMatch(/^\/uploads\/products\//);

    const servedImage = await request(app).get(uploadedImagePath);
    expect(servedImage.status).toBe(200);
    expect(servedImage.headers["content-type"]).toMatch(/^image\/png/);
  });

  it("rejects unsupported product image types with a client error", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${farmerToken}`)
      .field("name", "Invalid image crop")
      .field("category", "Vegetables")
      .field("price", "12")
      .attach("images", Buffer.from("<svg></svg>"), {
        filename: "uploaded-crop.svg",
        contentType: "image/svg+xml",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/JPEG, PNG, and WebP/);
  });

  it("prevents a farmer from modifying another farmer's product", async () => {
    const response = await request(app)
      .put(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${otherFarmerToken}`)
      .field("stock", "900");

    expect(response.status).toBe(403);
  });

  it("rejects unsupported availability states", async () => {
    const response = await request(app)
      .put(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .field("status", "Deleted");

    expect(response.status).toBe(400);
  });

  it("returns only the farmer's order items and excludes private delivery details", async () => {
    const response = await request(app)
      .get("/api/orders/farmer")
      .set("Authorization", `Bearer ${farmerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].items).toHaveLength(1);
    expect(response.body[0].items[0].name).toBe("Farmer One crop");
    expect(response.body[0].total).toBe(20);
    expect(response.body[0].address).toEqual({ name: "Test Customer" });
    expect(JSON.stringify(response.body)).not.toContain("Farmer Two crop");
    expect(JSON.stringify(response.body)).not.toContain("555-0100");
  });

  it("limits farmer order details to their own items", async () => {
    const response = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${farmerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.total).toBe(20);
    expect(response.body.address).toEqual({ name: "Test Customer" });
  });

  it("prevents a farmer with no items in an order from viewing or updating it", async () => {
    const details = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${outsiderFarmerToken}`);
    const update = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${outsiderFarmerToken}`)
      .send({ status: "Packed" });

    expect(details.status).toBe(403);
    expect(update.status).toBe(403);
  });
});
