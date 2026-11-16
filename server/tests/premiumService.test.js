const bcrypt = require("bcryptjs");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const NewsletterSubscription = require("../src/models/NewsletterSubscription");
const Newsletter = require("../src/models/Newsletter");
const { isPremiumCustomer } = require("../src/services/premiumService");

let customerId;

beforeAll(async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash("ValidPass1!", 10);
  const customer = await User.create({
    name: "Premium Test Customer",
    email: "premium.test@example.test",
    passwordHash,
    role: "customer",
    status: "active",
  });
  customerId = customer._id;
  await Newsletter.create({ email: "premium.test@example.test", isActive: true, subscriberType: "customer" });
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await NewsletterSubscription.deleteMany({ user: customerId });
});

describe("isPremiumCustomer - subscription validation", () => {
  it("returns false when no subscription exists", async () => {
    expect(await isPremiumCustomer(customerId)).toBe(false);
  });

  it("returns false for pending subscription", async () => {
    await NewsletterSubscription.create({
      user: customerId,
      email: "premium.test@example.test",
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      currency: "INR",
      billingCycle: "monthly",
      status: "pending",
      startDate: null,
      endDate: null,
      paymentReference: "txn-1",
    });
    expect(await isPremiumCustomer(customerId)).toBe(false);
  });

  it("returns false for active subscription without lastPaymentId (unpaid)", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await NewsletterSubscription.create({
      user: customerId,
      email: "premium.test@example.test",
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      currency: "INR",
      billingCycle: "monthly",
      status: "active",
      startDate: new Date(),
      endDate: future,
      paymentReference: "txn-2",
      lastPaymentId: null,
    });
    expect(await isPremiumCustomer(customerId)).toBe(false);
  });

  it("returns false for expired subscription", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const paymentId = new (require("mongoose")).Types.ObjectId();
    await NewsletterSubscription.create({
      user: customerId,
      email: "premium.test@example.test",
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      currency: "INR",
      billingCycle: "monthly",
      status: "active",
      startDate: past,
      endDate: past,
      paymentReference: "txn-3",
      lastPaymentId: paymentId,
    });
    expect(await isPremiumCustomer(customerId)).toBe(false);
  });

  it("returns false for cancelled subscription", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const paymentId = new (require("mongoose")).Types.ObjectId();
    await NewsletterSubscription.create({
      user: customerId,
      email: "premium.test@example.test",
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      currency: "INR",
      billingCycle: "monthly",
      status: "cancelled",
      startDate: new Date(),
      endDate: future,
      paymentReference: "txn-4",
      lastPaymentId: paymentId,
    });
    expect(await isPremiumCustomer(customerId)).toBe(false);
  });

  it("returns false for payment_failed subscription", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const paymentId = new (require("mongoose")).Types.ObjectId();
    await NewsletterSubscription.create({
      user: customerId,
      email: "premium.test@example.test",
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      currency: "INR",
      billingCycle: "monthly",
      status: "payment_failed",
      startDate: new Date(),
      endDate: future,
      paymentReference: "txn-5",
      lastPaymentId: paymentId,
    });
    expect(await isPremiumCustomer(customerId)).toBe(false);
  });

  it("returns true for active paid subscription with valid future endDate", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const paymentId = new (require("mongoose")).Types.ObjectId();
    await NewsletterSubscription.create({
      user: customerId,
      email: "premium.test@example.test",
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      currency: "INR",
      billingCycle: "monthly",
      status: "active",
      startDate: new Date(),
      endDate: future,
      paymentReference: "txn-6",
      lastPaymentId: paymentId,
    });
    expect(await isPremiumCustomer(customerId)).toBe(true);
  });

  it("returns false when newsletter is inactive even with active subscription", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const paymentId = new (require("mongoose")).Types.ObjectId();
    await NewsletterSubscription.create({
      user: customerId,
      email: "premium.test@example.test",
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      currency: "INR",
      billingCycle: "monthly",
      status: "active",
      startDate: new Date(),
      endDate: future,
      paymentReference: "txn-7",
      lastPaymentId: paymentId,
    });
    await Newsletter.findOneAndUpdate({ email: "premium.test@example.test" }, { isActive: false });
    expect(await isPremiumCustomer(customerId)).toBe(false);
  });

  it("returns false for non-customer user", async () => {
    const passwordHash = await bcrypt.hash("ValidPass1!", 10);
    const farmer = await User.create({
      name: "Premium Test Farmer",
      email: "premium.farmer@example.test",
      passwordHash,
      role: "farmer",
      status: "active",
    });
    await Newsletter.create({ email: "premium.farmer@example.test", isActive: true, subscriberType: "farmer" });
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const paymentId = new (require("mongoose")).Types.ObjectId();
    await NewsletterSubscription.create({
      user: farmer._id,
      email: "premium.farmer@example.test",
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      currency: "INR",
      billingCycle: "monthly",
      status: "active",
      startDate: new Date(),
      endDate: future,
      paymentReference: "txn-8",
      lastPaymentId: paymentId,
    });
    expect(await isPremiumCustomer(farmer._id)).toBe(false);
  });

  it("returns false for blocked customer", async () => {
    await User.findByIdAndUpdate(customerId, { status: "blocked" });
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const paymentId = new (require("mongoose")).Types.ObjectId();
    await NewsletterSubscription.create({
      user: customerId,
      email: "premium.test@example.test",
      planId: "greenmart-premium",
      planName: "GreenMart Premium",
      amount: 199,
      currency: "INR",
      billingCycle: "monthly",
      status: "active",
      startDate: new Date(),
      endDate: future,
      paymentReference: "txn-9",
      lastPaymentId: paymentId,
    });
    expect(await isPremiumCustomer(customerId)).toBe(false);
    await User.findByIdAndUpdate(customerId, { status: "active" });
  });

  it("returns false for null/undefined userId", async () => {
    expect(await isPremiumCustomer(null)).toBe(false);
    expect(await isPremiumCustomer(undefined)).toBe(false);
    expect(await isPremiumCustomer("")).toBe(false);
  });
});
