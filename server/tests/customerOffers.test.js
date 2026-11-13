const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Offer = require("../src/models/Offer");
const Newsletter = require("../src/models/Newsletter");
const NewsletterSubscription = require("../src/models/NewsletterSubscription");

let farmerToken;
let customerToken;
let adminToken;
let farmerId;
let customerId;
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
  customerId = customer._id;
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

  it("keeps the public offer price and separately reports Premium extra savings", async () => {
    await createOffer({
      ...activeDates,
      title: "Public Offer With Premium Extra",
      discountValue: 20,
      maximumDiscount: null,
      isSubscriberExclusive: false,
      exclusiveDiscountType: "Fixed Amount",
      exclusiveDiscountValue: 5,
      status: "Active",
      approvedAt: now,
      approvedBy: (await User.findOne({ role: "admin" }))._id,
    });

    const res = await request(app).get("/api/offers/customer");
    expect(res.status).toBe(200);
    const offer = res.body.active.find((item) => item.title === "Public Offer With Premium Extra");
    expect(offer).toMatchObject({
      isSubscriberExclusive: false,
      originalPrice: 100,
      offerPrice: 80,
      discountAmount: 20,
      discountPercent: 20,
      premiumDiscountAmount: 5,
    });
    expect(offer).not.toHaveProperty("exclusivePrice");
    expect(offer).not.toHaveProperty("premiumPrice");
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

  it("reports the total subscriber price reduction and chooses one best offer per product", async () => {
    const exclusiveProduct = await Product.create({
      name: "Subscriber Offer Test Honey",
      description: "Test product for subscriber offer price accuracy",
      category: "Other",
      price: 100,
      unit: "kg",
      stock: 20,
      farmer: farmerId,
    });
    const email = "co.customer@example.test";
    await Newsletter.create({ email, subscriberType: "customer", isActive: true });
    await NewsletterSubscription.create({
      user: customerId,
      email,
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      status: "active",
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await createOffer({
      ...activeDates,
      title: "Subscriber Price Test",
      product: String(exclusiveProduct._id),
      status: "Active",
      approvedAt: now,
      approvedBy: (await User.findOne({ role: "admin" }))._id,
      discountValue: 20,
      isSubscriberExclusive: true,
      exclusiveDiscountType: "Percentage",
      exclusiveDiscountValue: 10,
    });
    await createOffer({
      ...activeDates,
      title: "Weaker Subscriber Offer",
      product: String(exclusiveProduct._id),
      status: "Active",
      approvedAt: now,
      approvedBy: (await User.findOne({ role: "admin" }))._id,
      discountValue: 10,
      isSubscriberExclusive: true,
      exclusiveDiscountType: "Percentage",
      exclusiveDiscountValue: 5,
    });

    const exampleProducts = await Product.create([
      {
        name: "Diwali Special Dry Fruits Gift Hamper",
        description: "Subscriber discount calculation test",
        category: "Gifts",
        price: 999,
        stock: 20,
        farmer: farmerId,
      },
      {
        name: "Fresh Marigold Flowers",
        description: "Subscriber discount calculation test",
        category: "Flowers",
        price: 80,
        stock: 20,
        farmer: farmerId,
      },
      {
        name: "Green Gram",
        description: "Subscriber discount calculation test",
        category: "Pulses",
        price: 50,
        stock: 20,
        farmer: farmerId,
      },
      {
        name: "Curd Updated",
        description: "Subscriber discount calculation test",
        category: "Dairy",
        price: 50,
        stock: 20,
        farmer: farmerId,
      },
    ]);
    const adminId = (await User.findOne({ role: "admin" }))._id;
    await Promise.all([
      createOffer({
        ...activeDates,
        title: "Diwali Subscriber Calculation",
        product: String(exampleProducts[0]._id),
        status: "Active",
        approvedAt: now,
        approvedBy: adminId,
        discountValue: 10,
        maximumDiscount: null,
        isSubscriberExclusive: false,
        exclusiveDiscountType: "Fixed Amount",
        exclusiveDiscountValue: 10,
      }),
      createOffer({
        ...activeDates,
        title: "Marigold Subscriber Calculation",
        product: String(exampleProducts[1]._id),
        status: "Active",
        approvedAt: now,
        approvedBy: adminId,
        discountValue: 20,
        maximumDiscount: null,
        isSubscriberExclusive: false,
        exclusiveDiscountType: "Fixed Amount",
        exclusiveDiscountValue: 5,
      }),
      createOffer({
        ...activeDates,
        title: "Green Gram Subscriber Calculation",
        product: String(exampleProducts[2]._id),
        status: "Active",
        approvedAt: now,
        approvedBy: adminId,
        discountValue: 50,
        maximumDiscount: null,
        isSubscriberExclusive: false,
        exclusiveDiscountType: "Fixed Amount",
        exclusiveDiscountValue: 3.75,
      }),
      createOffer({
        ...activeDates,
        title: "Curd Premium Calculation",
        product: String(exampleProducts[3]._id),
        status: "Active",
        approvedAt: now,
        approvedBy: adminId,
        discountValue: 10,
        maximumDiscount: null,
        isSubscriberExclusive: false,
        exclusiveDiscountType: "Fixed Amount",
        exclusiveDiscountValue: 6.75,
      }),
    ]);

    const regularOffersResponse = await request(app).get("/api/offers/customer");
    expect(regularOffersResponse.status).toBe(200);
    const exclusiveTeaser = regularOffersResponse.body.active.find(
      (item) => String(item.product._id) === String(exclusiveProduct._id) && item.regularDiscountAmount === 20
    );
    expect(exclusiveTeaser).toMatchObject({
      title: "Subscriber Exclusive",
      isSubscriberExclusive: true,
      subscriberExclusiveTeaser: true,
      originalPrice: 100,
      offerPrice: 100,
      discountAmount: 0,
      discountPercent: 0,
      discountType: null,
      discountValue: null,
      regularDiscountType: "Percentage",
      regularDiscountValue: 20,
      regularDiscountAmount: 20,
      regularDiscountPercent: 20,
      premiumDiscountAmount: 8,
    });
    expect(exclusiveTeaser).not.toHaveProperty("exclusivePrice");
    const activePriceExamples = [
      ["Diwali Subscriber Calculation", 899.1, 10],
      ["Marigold Subscriber Calculation", 64, 5],
      ["Green Gram Subscriber Calculation", 25, 3.75],
      ["Curd Premium Calculation", 45, 6.75],
    ];
    for (const [title, offerPrice, premiumDiscountAmount] of activePriceExamples) {
      expect(regularOffersResponse.body.active.find((item) => item.title === title)).toMatchObject({
        isSubscriberExclusive: false,
        offerPrice,
        premiumDiscountAmount,
      });
    }
    const publicProduct = await request(app).get(`/api/products/storefront/${exclusiveProduct._id}`);
    expect(publicProduct.status).toBe(200);
    expect(publicProduct.body.offer).toBeNull();
    const publicFeed = await request(app).get("/api/products/storefront/offers");
    expect(publicFeed.status).toBe(200);
    expect(publicFeed.body.items.some((item) => item.title === "Subscriber Price Test")).toBe(false);

    const response = await request(app)
      .get("/api/newsletter/customer/offers")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(response.status).toBe(200);
    const offer = response.body.items.find((item) => String(item.product._id) === String(exclusiveProduct._id));
    expect(offer).toMatchObject({
      title: "Subscriber Price Test",
      isSubscriberExclusive: true,
      originalPrice: 100,
      publicPrice: 80,
      exclusivePrice: 72,
      offerPrice: 72,
      discountAmount: 28,
      discountPercent: 28,
    });
    expect(response.body.items.filter((item) => String(item.product._id) === String(exclusiveProduct._id))).toHaveLength(1);
    expect(response.body.items.find((item) => item.title === "Diwali Subscriber Calculation")).toMatchObject({
      originalPrice: 999,
      publicPrice: 899.1,
      exclusivePrice: 889.1,
      additionalSavings: 10,
      discountAmount: 109.9,
      discountPercent: 11,
    });
    expect(response.body.items.find((item) => item.title === "Marigold Subscriber Calculation")).toMatchObject({
      originalPrice: 80,
      publicPrice: 64,
      exclusivePrice: 59,
      additionalSavings: 5,
      discountAmount: 21,
      discountPercent: 26,
    });
    expect(response.body.items.find((item) => item.title === "Green Gram Subscriber Calculation")).toMatchObject({
      originalPrice: 50,
      publicPrice: 25,
      exclusivePrice: 21.25,
      additionalSavings: 3.75,
      discountAmount: 28.75,
      discountPercent: 58,
    });
    expect(response.body.items.find((item) => item.title === "Curd Premium Calculation")).toMatchObject({
      originalPrice: 50,
      publicPrice: 45,
      exclusivePrice: 38.25,
      additionalSavings: 6.75,
      discountAmount: 11.75,
      discountPercent: 24,
    });
  });

  it("does not return exclusive prices for expired paid subscriptions", async () => {
    const email = "co.customer@example.test";
    await Newsletter.updateOne(
      { email },
      { $set: { subscriberType: "customer", isActive: true } },
      { upsert: true }
    );
    await NewsletterSubscription.create({
      user: customerId,
      email,
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      status: "active",
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .get("/api/newsletter/customer/offers")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ items: [], subscribed: false });
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
