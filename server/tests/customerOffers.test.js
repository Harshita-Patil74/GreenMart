const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Offer = require("../src/models/Offer");

let farmerToken;
let customerToken;
let adminToken;
let farmerId;
let productId;

const now = new Date();

const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const futureEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
const pastStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const pastEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

const activeDates = { startDate: pastStart, endDate: futureEnd };
const upcomingDates = { startDate: futureStart, endDate: futureEnd };

beforeAll(async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash("ValidPass1!", 10);
  const [farmer, customer, admin] = await Promise.all([
    User.create({ name: "Offer Farmer", email: "co.farmer@example.test", passwordHash, role: "farmer" }),
    User.create({ name: "Offer Customer", email: "co.customer@example.test", passwordHash, role: "customer" }),
    User.create({ name: "Offer Admin", email: "co.admin@example.test", passwordHash, role: "admin" }),
  ]);
  farmerId = farmer._id;
  await FarmerProfile.create({
    user: farmer._id, farmName: "Offer Farm", certification: { verifiedByAdmin: true },
  });

  const product = await Product.create({
    name: "Organic Tomatoes", description: "Fresh organic tomatoes", category: "Vegetables",
    price: 100, unit: "kg", stock: 100, farmer: farmerId, images: ["https://images.example.test/tomato.jpg"],
  });
  productId = product._id;

  const [farmerLogin, customerLogin, adminLogin] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: farmer.email, password: "ValidPass1!" }),
    request(app).post("/api/auth/login").send({ email: customer.email, password: "ValidPass1!" }),
    request(app).post("/api/auth/login").send({ email: admin.email, password: "ValidPass1!" }),
  ]);
  farmerToken = farmerLogin.body.token;
  customerToken = customerLogin.body.token;
  adminToken = adminLogin.body.token;
});

afterAll(async () => disconnectDB());

async function createOffer(overrides = {}) {
  return Offer.create({
    title: "Test Offer",
    description: "A test offer description",
    product: String(productId),
    type: "Seasonal Offer",
    discountType: "Percentage",
    discountValue: 20,
    minimumQuantity: 1,
    minimumAmount: 0,
    maximumDiscount: 50,
    farmer: farmerId,
    ...overrides,
  });
}

describe("Customer offers API", () => {
  it("returns active and upcoming offers", async () => {
    await createOffer({ ...activeDates, title: "Active Tomato Offer", status: "Active", approvedAt: now, approvedBy: (await User.findOne({ role: "admin" }))._id });
    await createOffer({ ...upcomingDates, title: "Upcoming Tomato Offer", status: "Active", approvedAt: now, approvedBy: (await User.findOne({ role: "admin" }))._id });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    expect(res.body.active).toBeInstanceOf(Array);
    expect(res.body.upcoming).toBeInstanceOf(Array);
    expect(res.body.serverTime).toBeDefined();

    const activeTitles = res.body.active.map((o) => o.title);
    const upcomingTitles = res.body.upcoming.map((o) => o.title);
    expect(activeTitles).toContain("Active Tomato Offer");
    expect(upcomingTitles).toContain("Upcoming Tomato Offer");
  });

  it("hides pending offers from customer API", async () => {
    await createOffer({ ...activeDates, title: "Pending Offer", status: "Pending" });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const allTitles = [...res.body.active, ...res.body.upcoming].map((o) => o.title);
    expect(allTitles).not.toContain("Pending Offer");
  });

  it("hides rejected offers from customer API", async () => {
    const admin = await User.findOne({ role: "admin" });
    await createOffer({ ...activeDates, title: "Rejected Offer", status: "Rejected", approvedAt: now, approvedBy: admin._id });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const allTitles = [...res.body.active, ...res.body.upcoming].map((o) => o.title);
    expect(allTitles).not.toContain("Rejected Offer");
  });

  it("hides deactivated offers from customer API", async () => {
    await createOffer({ ...activeDates, title: "Deactivated Offer", status: "Inactive", isActive: false });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const allTitles = [...res.body.active, ...res.body.upcoming].map((o) => o.title);
    expect(allTitles).not.toContain("Deactivated Offer");
  });

  it("hides expired offers from customer API", async () => {
    await createOffer({ ...activeDates, title: "Expired Offer", startDate: pastStart, endDate: pastEnd, status: "Active", approvedAt: now, approvedBy: (await User.findOne({ role: "admin" }))._id });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const allTitles = [...res.body.active, ...res.body.upcoming].map((o) => o.title);
    expect(allTitles).not.toContain("Expired Offer");
  });

  it("returns product details and images correctly", async () => {
    await createOffer({ ...activeDates, title: "Product Detail Offer", status: "Active", approvedAt: now, approvedBy: (await User.findOne({ role: "admin" }))._id });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const offer = res.body.active.find((o) => o.title === "Product Detail Offer");
    expect(offer).toBeDefined();
    expect(offer.product).toMatchObject({
      name: "Organic Tomatoes",
      category: "Vegetables",
      price: 100,
      unit: "kg",
    });
    expect(offer.product.images).toBeInstanceOf(Array);
    expect(offer.farmer.name).toBe("Offer Farmer");
  });

  it("calculates percentage discount correctly", async () => {
    await createOffer({ ...activeDates, title: "Percentage Discount", discountValue: 20, status: "Active", approvedAt: now, approvedBy: (await User.findOne({ role: "admin" }))._id });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const offer = res.body.active.find((o) => o.title === "Percentage Discount");
    expect(offer).toBeDefined();
    expect(offer.discountType).toBe("Percentage");
    expect(offer.discountValue).toBe(20);
    expect(offer.originalPrice).toBe(100);
    expect(offer.offerPrice).toBe(80);
    expect(offer.discountAmount).toBe(20);
    expect(offer.discountPercent).toBe(20);
  });

  it("calculates fixed amount discount correctly", async () => {
    await createOffer({ ...activeDates, title: "Fixed Discount", discountType: "Fixed Amount", discountValue: 30, status: "Active", approvedAt: now, approvedBy: (await User.findOne({ role: "admin" }))._id });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const offer = res.body.active.find((o) => o.title === "Fixed Discount");
    expect(offer).toBeDefined();
    expect(offer.discountType).toBe("Fixed Amount");
    expect(offer.discountValue).toBe(30);
    expect(offer.originalPrice).toBe(100);
    expect(offer.offerPrice).toBe(70);
    expect(offer.discountAmount).toBe(30);
  });

  it("respects maximum discount limit", async () => {
    await createOffer({ ...activeDates, title: "Max Discount", discountValue: 50, maximumDiscount: 5, status: "Active", approvedAt: now, approvedBy: (await User.findOne({ role: "admin" }))._id });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const offer = res.body.active.find((o) => o.title === "Max Discount");
    expect(offer).toBeDefined();
    expect(offer.discountAmount).toBe(5);
    expect(offer.offerPrice).toBe(95);
  });

  it("excludes upcoming offers from active section", async () => {
    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const upcomingTitles = res.body.upcoming.map((o) => o.title);
    if (upcomingTitles.length > 0) {
      const activeTitles = res.body.active.map((o) => o.title);
      upcomingTitles.forEach((title) => {
        expect(activeTitles).not.toContain(title);
      });
    }
  });

  it("does not expose private farmer data", async () => {
    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    [...res.body.active, ...res.body.upcoming].forEach((offer) => {
      expect(offer.farmer).toMatchObject({ _id: expect.any(String), name: expect.any(String) });
      expect(offer.farmer).not.toHaveProperty("email");
      expect(offer.farmer).not.toHaveProperty("phone");
      expect(offer.farmer).not.toHaveProperty("passwordHash");
      expect(offer.farmer).not.toHaveProperty("role");
    });
  });
});
