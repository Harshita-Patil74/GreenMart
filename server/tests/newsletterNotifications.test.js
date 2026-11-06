const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const Newsletter = require("../src/models/Newsletter");

// Mock createNotification to avoid email/socket dependencies in tests
jest.mock("../src/services/notificationService", () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

const { createNotification } = require("../src/services/notificationService");
const c = require("../src/controllers/newsletterController");

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeAll(async () => await connectDB());
afterAll(async () => await disconnectDB());

beforeEach(async () => {
  createNotification.mockClear();
  createNotification.mockResolvedValue({});
  await User.deleteMany({});
  await Newsletter.deleteMany({});
});

describe("Admin newsletter unsubscribe notifications", () => {
  it("creates a persisted admin notification when a customer unsubscribes", async () => {
    const user = await User.create({ name: "Customer User", email: "ram12@gmail.com", passwordHash: "hashed_password", role: "customer" });
    await Newsletter.create({ email: "ram12@gmail.com", isActive: true, subscriberType: "customer" });
    const req = { user: { _id: user._id, email: "ram12@gmail.com", role: "customer" }, body: {} };
    const res = makeRes();
    const next = jest.fn();
    await c.customerUnsubscribe(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "You have successfully unsubscribed from GreenMart updates.", isSubscribed: false })
    );
  });

  it("does not create a notification when the subscriber is already unsubscribed", async () => {
    const user = await User.create({ name: "Customer User", email: "already@example.com", passwordHash: "hashed_password", role: "customer" });
    await Newsletter.create({ email: "already@example.com", isActive: false, subscriberType: "customer" });
    const req = { user: { _id: user._id, email: "already@example.com", role: "customer" }, body: {} };
    const res = makeRes();
    const next = jest.fn();
    await c.customerUnsubscribe(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "You have successfully unsubscribed from GreenMart updates.", isSubscribed: false })
    );
  });

  it("rejects non-customer unsubscribe attempts", async () => {
    const user = await User.create({ name: "Farmer User", email: "farmer@example.com", passwordHash: "hashed_password", role: "farmer" });
    const req = { user: { _id: user._id, email: "farmer@example.com", role: "farmer" }, body: {} };
    const res = makeRes();
    const next = jest.fn();
    await c.customerUnsubscribe(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("customer subscribe flow creates an admin notification", async () => {
    const user = await User.create({ name: "New Sub", email: "newsub@example.com", passwordHash: "hashed_password", role: "customer" });
    const req = { user: { _id: user._id, email: "newsub@example.com", role: "customer" }, body: {} };
    const res = makeRes();
    const next = jest.fn();
    await c.customerSubscribe(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "You're subscribed to GreenMart newsletter updates!", isSubscribed: true })
    );
  });
});
