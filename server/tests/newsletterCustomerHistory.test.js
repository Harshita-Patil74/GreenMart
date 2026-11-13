const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const NewsletterCampaign = require("../src/models/NewsletterCampaign");
const NewsletterRecipient = require("../src/models/NewsletterRecipient");

let passwordHash;

beforeAll(async () => {
  await connectDB();
  passwordHash = await bcrypt.hash("ValidPass1!", 10);
});

afterAll(async () => {
  await disconnectDB();
});

afterEach(async () => {
  await NewsletterRecipient.deleteMany({});
  await NewsletterCampaign.deleteMany({});
  await User.deleteMany({});
});

async function createCustomer(email) {
  const user = await User.create({
    name: "Newsletter Customer",
    email,
    passwordHash,
    role: "customer",
  });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "ValidPass1!" });
  return { email, token: login.body.token };
}

async function addNewsletter(email, campaignName, campaignType, isRead = false) {
  const campaign = await NewsletterCampaign.create({
    campaignName,
    campaignType,
    subject: campaignName,
    content: `Content for ${campaignName}`,
    status: "sent",
  });
  await NewsletterRecipient.create({
    campaignId: campaign._id,
    email,
    status: "delivered",
    readAt: isRead ? new Date() : null,
  });
  return campaign;
}

describe("Customer newsletter history search", () => {
  it("searches campaign titles case-insensitively and combines type and read filters", async () => {
    const customer = await createCustomer("history.customer@example.test");
    const campaigns = [
      ["GreenMart Diwali Festival - Exclusive Premium Deals", "offers", false],
      ["GreenMart Fresh Harvest Special", "fresh-harvest", false],
      ["GreenMart Exclusive Offers & Discounts", "offers", true],
      ["GreenMart Community Announcement", "announcements", false],
      ["GreenMart Premium Exclusive Offers", "offers", false],
    ];
    for (const [title, type, isRead] of campaigns) {
      await addNewsletter(customer.email, title, type, isRead);
    }

    const search = async (query, filters = {}) => request(app)
      .get("/api/newsletter/customer/newsletters")
      .set("Authorization", `Bearer ${customer.token}`)
      .query({ search: query, ...filters });

    const diwali = await search("  dIwAlI  ");
    expect(diwali.body.items.map((item) => item.campaignName)).toEqual([
      "GreenMart Diwali Festival - Exclusive Premium Deals",
    ]);

    const freshHarvest = await search("Harvest Fresh", { type: "fresh-harvest" });
    expect(freshHarvest.body.items.map((item) => item.campaignName)).toEqual([
      "GreenMart Fresh Harvest Special",
    ]);

    const exclusiveUnreadOffers = await search("Exclusive Offers", { type: "offers", read: "unread" });
    expect(exclusiveUnreadOffers.body.items.map((item) => item.campaignName)).toEqual([
      "GreenMart Premium Exclusive Offers",
    ]);

    const readOffersAfterClearingSearch = await search("", { type: "offers", read: "read" });
    expect(readOffersAfterClearingSearch.body.items.map((item) => item.campaignName)).toEqual([
      "GreenMart Exclusive Offers & Discounts",
    ]);

    const missing = await search("xyz123");
    expect(missing.body).toMatchObject({ items: [], total: 0, pages: 0 });

    const escapedRegex = await search("[");
    expect(escapedRegex.status).toBe(200);
    expect(escapedRegex.body.items).toEqual([]);
  });

  it("applies title search before pagination and limits results to the authenticated customer", async () => {
    const customer = await createCustomer("page.customer@example.test");
    const otherCustomer = await createCustomer("other.customer@example.test");
    for (let index = 0; index < 12; index += 1) {
      await addNewsletter(customer.email, `PaginationMarker Campaign ${index}`, "new-products");
    }
    await addNewsletter(otherCustomer.email, "PaginationMarker Private Campaign", "new-products");

    const getPage = (page) => request(app)
      .get("/api/newsletter/customer/newsletters")
      .set("Authorization", `Bearer ${customer.token}`)
      .query({ search: "  paginationmarker ", type: "new-products", page, limit: 10 });

    const firstPage = await getPage(1);
    expect(firstPage.status).toBe(200);
    expect(firstPage.body).toMatchObject({ page: 1, limit: 10, total: 12, pages: 2 });
    expect(firstPage.body.items).toHaveLength(10);

    const secondPage = await getPage(2);
    expect(secondPage.body).toMatchObject({ page: 2, total: 12, pages: 2 });
    expect(secondPage.body.items).toHaveLength(2);
    expect(secondPage.body.items.every((item) => item.campaignName.includes("PaginationMarker"))).toBe(true);
    expect([...firstPage.body.items, ...secondPage.body.items]
      .some((item) => item.campaignName.includes("Private"))).toBe(false);
  });
});
