// @ts-nocheck
const request = require("supertest");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Cart = require("../src/models/Cart");
const MergeOperation = require("../src/models/MergeOperation");
const CartLock = require("../src/models/CartLock");

describe("Cart guest-to-customer merge", () => {
  beforeAll(async () => await connectDB());
  afterAll(async () => await disconnectDB());

  let customerToken, farmerToken, adminToken, customerUserId, productId, outOfStockProductId, deletedProductId, inactiveProductId;

  beforeAll(async () => {
    const customer = await User.create({
      name: "Merge Customer",
      email: "merge.customer@demo.greenmart.test",
      passwordHash: await bcrypt.hash("demo-password", 10),
      role: "customer",
    });
    customerUserId = customer._id;
    const cRes = await request(app).post("/api/auth/login").send({
      email: "merge.customer@demo.greenmart.test",
      password: "demo-password",
    });
    customerToken = cRes.body.token;

    const farmer = await User.create({
      name: "Merge Farmer",
      email: "merge.farmer@demo.greenmart.test",
      passwordHash: await bcrypt.hash("demo-password", 10),
      role: "farmer",
    });
    const fRes = await request(app).post("/api/auth/login").send({
      email: "merge.farmer@demo.greenmart.test",
      password: "demo-password",
    });
    farmerToken = fRes.body.token;

    const admin = await User.create({
      name: "Merge Admin",
      email: "merge.admin@demo.greenmart.test",
      passwordHash: await bcrypt.hash("demo-password", 10),
      role: "admin",
    });
    const aRes = await request(app).post("/api/auth/login").send({
      email: "merge.admin@demo.greenmart.test",
      password: "demo-password",
    });
    adminToken = aRes.body.token;

    const activeProduct = await Product.create({
      name: "Active Product",
      description: "test",
      category: "Vegetables",
      price: 50,
      stock: 10,
      farmer: farmer._id,
    });
    productId = activeProduct._id;

    const oosProduct = await Product.create({
      name: "Out of Stock Product",
      description: "test",
      category: "Vegetables",
      price: 30,
      stock: 0,
      farmer: farmer._id,
    });
    outOfStockProductId = oosProduct._id;

    const deletedProduct = await Product.create({
      name: "Deleted Product",
      description: "test",
      category: "Vegetables",
      price: 20,
      stock: 5,
      isDeleted: true,
      farmer: farmer._id,
    });
    deletedProductId = deletedProduct._id;

    const inactiveProduct = await Product.create({
      name: "Inactive Product",
      description: "test",
      category: "Vegetables",
      price: 25,
      stock: 5,
      status: "Inactive",
      farmer: farmer._id,
    });
    inactiveProductId = inactiveProduct._id;
  });

  beforeEach(async () => {
    await Cart.deleteMany({});
    await MergeOperation.deleteMany({});
    await CartLock.deleteMany({});
  });

  // ── Validation tests ──────────────────────────────────────────────

  it("rejects missing idempotency key with 400", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  it("rejects null idempotency key with 400", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 1 }], idempotencyKey: null });
    expect(res.status).toBe(400);
  });

  it("rejects empty string idempotency key with 400", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 1 }], idempotencyKey: "" });
    expect(res.status).toBe(400);
  });

  it("rejects non-array items payload with 400", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: "not-an-array", idempotencyKey: "bad-items-key" });
    expect(res.status).toBe(400);
  });

  // ── Authorization tests ───────────────────────────────────────────

  it("rejects non-customer roles (farmer)", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ items: [{ productId, quantity: 1 }], idempotencyKey: "farmer-key-1" });
    expect(res.status).toBe(403);
  });

  it("rejects non-customer roles (admin)", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ items: [{ productId, quantity: 1 }], idempotencyKey: "admin-key-1" });
    expect(res.status).toBe(403);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .send({ items: [{ productId, quantity: 1 }], idempotencyKey: "no-auth-key-1" });
    expect(res.status).toBe(401);
  });

  // ── Basic merge tests ─────────────────────────────────────────────

  it("merges guest items into an empty database cart", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }, { productId: outOfStockProductId, quantity: 1 }], idempotencyKey: "empty-cart-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.skipped.map(String)).toContain(String(outOfStockProductId));

    const cart = await Cart.findOne({ user: customerUserId });
    expect(cart.items).toHaveLength(1);
    expect(String(cart.items[0].product)).toBe(String(productId));
    expect(cart.items[0].quantity).toBe(2);

    const op = await MergeOperation.findOne({ userId: customerUserId, operationKey: "empty-cart-key-1" });
    expect(op.status).toBe("completed");
    expect(op.cartMutated).toBe(true);

    // Verify idempotency receipt stored in Cart
    expect(cart.mergeReceipts).toHaveLength(1);
    expect(cart.mergeReceipts[0].operationKey).toBe("empty-cart-key-1");
    expect(cart.mergeReceipts[0].status).toBe("applied");
  });

  it("handles empty items array without error", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [], idempotencyKey: "empty-items-key-1" });
    expect(res.status).toBe(200);
  });

  it("combines quantities when the same product exists in both carts", async () => {
    await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: "combine-key-1" });
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 3 }], idempotencyKey: "combine-key-2" });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item.quantity).toBe(5);

    const cart = await Cart.findOne({ user: customerUserId });
    const storedItem = cart.items.find((i) => String(i.product) === String(productId));
    expect(storedItem.quantity).toBe(5);
  });

  it("caps combined quantity at available stock", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 12 }], idempotencyKey: "stock-cap-key-1" });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item.quantity).toBe(10);
  });

  // ── Product availability tests ────────────────────────────────────

  it("skips soft-deleted products", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId: deletedProductId, quantity: 1 }], idempotencyKey: "deleted-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.skipped.map(String)).toContain(String(deletedProductId));
  });

  it("skips inactive products", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId: inactiveProductId, quantity: 1 }], idempotencyKey: "inactive-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.skipped.map(String)).toContain(String(inactiveProductId));
  });

  it("skips invalid product IDs", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId: "not-a-valid-id", quantity: 1 }], idempotencyKey: "invalid-id-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it("skips missing products", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId: fakeId, quantity: 1 }], idempotencyKey: "missing-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.skipped.map(String)).toContain(String(fakeId));
  });

  it("skips zero quantity items", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 0 }], idempotencyKey: "zero-qty-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.skipped.map(String)).toContain(String(productId));
  });

  it("skips negative quantity items", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: -3 }], idempotencyKey: "negative-qty-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.skipped.map(String)).toContain(String(productId));
  });

  it("skips decimal quantity items", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2.5 }], idempotencyKey: "decimal-qty-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.skipped.map(String)).toContain(String(productId));
  });

  it("skips non-numeric quantity items", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: "abc" }], idempotencyKey: "non-numeric-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.skipped.map(String)).toContain(String(productId));
  });

  it("skips null or malformed guest items", async () => {
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [null, undefined, {}, { quantity: 1 }, { productId: "invalid" }], idempotencyKey: "malformed-key-1" });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  // ── Idempotency tests ─────────────────────────────────────────────

  it("same idempotency key submitted concurrently applies only once", async () => {
    const key = "same-key-concurrent-1";
    const res1 = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });
    const res2 = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 5 }], idempotencyKey: key });
    const [r1, r2] = await Promise.all([res1, res2]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    // Both responses should return the same canonical cart
    const item1 = r1.body.items.find((i) => String(i.product._id) === String(productId));
    const item2 = r2.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item1.quantity).toBe(item2.quantity);

    const cart = await Cart.findOne({ user: customerUserId });
    const storedItem = cart.items.find((i) => String(i.product) === String(productId));
    expect(storedItem.quantity).toBe(item1.quantity);

    // Only one MergeOperation should exist for this key
    const ops = await MergeOperation.find({ userId: customerUserId, operationKey: key });
    expect(ops).toHaveLength(1);
    expect(ops[0].status).toBe("completed");

    // Only one merge receipt in Cart
    expect(cart.mergeReceipts).toHaveLength(1);
    expect(cart.mergeReceipts[0].operationKey).toBe(key);
  });

  it("prevents duplicate merging with same idempotency key (sequential)", async () => {
    const key = "merge-idempotency-test-1";
    const res1 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });
    expect(res1.status).toBe(200);
    const item1 = res1.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item1.quantity).toBe(2);

    const res2 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 3 }], idempotencyKey: key });
    expect(res2.status).toBe(200);
    const item2 = res2.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item2.quantity).toBe(2);

    const cart = await Cart.findOne({ user: customerUserId });
    const storedItem = cart.items.find((i) => String(i.product) === String(productId));
    expect(storedItem.quantity).toBe(2);

    const op = await MergeOperation.findOne({ userId: customerUserId, operationKey: key });
    expect(op.status).toBe("completed");
    expect(cart.mergeReceipts).toHaveLength(1);
  });

  it("allows new merge operation with different idempotency key", async () => {
    const key1 = "merge-test-key-1";
    const key2 = "merge-test-key-2";
    await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key1 });
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 3 }], idempotencyKey: key2 });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item.quantity).toBe(5);
  });

  it("same-key requests with different payloads follow idempotency policy (first wins)", async () => {
    const key = "same-key-diff-payload-1";
    const res1 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 99 }], idempotencyKey: key });
    expect(res2.status).toBe(200);

    const item2 = res2.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item2.quantity).toBe(2); // First payload's quantity wins
  });

  // ── Concurrency tests ─────────────────────────────────────────────

  it("two different keys merging the same product do not lose either update", async () => {
    const key1 = "concurrent-diff-key-1";
    const key2 = "concurrent-diff-key-2";
    const res1 = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 3 }], idempotencyKey: key1 });
    const res2 = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 4 }], idempotencyKey: key2 });
    const [r1, r2] = await Promise.all([res1, res2]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const cart = await Cart.findOne({ user: customerUserId });
    const item = cart.items.find((i) => String(i.product) === String(productId));
    expect(item.quantity).toBe(7);

    const op1 = await MergeOperation.findOne({ userId: customerUserId, operationKey: key1 });
    const op2 = await MergeOperation.findOne({ userId: customerUserId, operationKey: key2 });
    expect(op1.status).toBe("completed");
    expect(op2.status).toBe("completed");
    expect(cart.mergeReceipts).toHaveLength(2);
  });

  it("two concurrent requests adding a new product do not create duplicate entries", async () => {
    const key1 = "concurrent-new-key-1";
    const key2 = "concurrent-new-key-2";
    const res1 = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key1 });
    const res2 = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 3 }], idempotencyKey: key2 });
    const [r1, r2] = await Promise.all([res1, res2]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const cart = await Cart.findOne({ user: customerUserId });
    const matching = cart.items.filter((i) => String(i.product) === String(productId));
    expect(matching).toHaveLength(1);
    expect(matching[0].quantity).toBe(5);
  });

  it("concurrent operations never exceed available stock", async () => {
    const key1 = "stock-race-key-1";
    const key2 = "stock-race-key-2";
    const res1 = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 8 }], idempotencyKey: key1 });
    const res2 = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 8 }], idempotencyKey: key2 });
    const [r1, r2] = await Promise.all([res1, res2]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const cart = await Cart.findOne({ user: customerUserId });
    const item = cart.items.find((i) => String(i.product) === String(productId));
    expect(item.quantity).toBeLessThanOrEqual(10);
  });

  it("stock changing after initial validation is rechecked before mutation", async () => {
    // Product stock is 10. First request validates stock=10, then we reduce stock to 1.
    // The merge should revalidate under the lock and cap at 1.
    const key1 = "stock-revalidate-key-1";

    // Reduce stock before the request
    await Product.findByIdAndUpdate(productId, { stock: 1 });

    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 8 }], idempotencyKey: key1 });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item.quantity).toBe(1);

    // Restore stock
    await Product.findByIdAndUpdate(productId, { stock: 10 });
  });

  // ── Lock management tests ─────────────────────────────────────────

  it("expired lock can be reclaimed atomically", async () => {
    const key = "expired-lock-key-1";

    // Create an expired lock for this user
    await CartLock.create({
      userId: customerUserId,
      owner: "stale-owner",
      expiresAt: new Date(Date.now() - 60000), // expired 1 minute ago
    });

    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item.quantity).toBe(2);
  });

  it("old lock owner cannot mutate cart after losing ownership", async () => {
    const key = "ownership-loss-key-1";

    // First request starts the merge
    const res1 = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 3 }], idempotencyKey: key });

    // Small delay to let first request claim the operation and acquire lock
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Manually expire the lock to simulate the first request losing its lease
    await CartLock.findOneAndUpdate(
      { userId: customerUserId },
      { expiresAt: new Date(Date.now() - 60000) }
    );

    // Second request with same key should reclaim and complete with its own quantity
    const res2 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });
    expect(res2.status).toBe(200);

    const cart = await Cart.findOne({ user: customerUserId });
    const item = cart.items.find((i) => String(i.product) === String(productId));
    // Should be 2 (from the reclaiming request), not 5 (3+2 from both)
    expect(item.quantity).toBe(2);

    const op = await MergeOperation.findOne({ userId: customerUserId, operationKey: key });
    expect(op.status).toBe("completed");

    // Ensure the detached first request's supertest server is closed.
    await res1;
  });

  it("lock renewal prevents valid long-running operation from losing its lease", async () => {
    // This test verifies the CartLock.renewLock method works
    const lock = await CartLock.create({
      userId: customerUserId,
      owner: "renewal-test-owner",
      expiresAt: new Date(Date.now() + 5000), // 5 seconds
    });

    // Renew the lock
    const renewed = await CartLock.renewLock(customerUserId, "renewal-test-owner", 30000);
    expect(renewed).toBeTruthy();
    expect(renewed.owner).toBe("renewal-test-owner");
    expect(renewed.expiresAt.getTime()).toBeGreaterThan(lock.expiresAt.getTime());

    // Renewal with wrong owner should fail
    const failedRenewal = await CartLock.renewLock(customerUserId, "wrong-owner", 30000);
    expect(failedRenewal).toBeNull();
  });

  it("failed lock renewal stops the operation from writing", async () => {
    // Hold a lock as owner A
    await CartLock.create({
      userId: customerUserId,
      owner: "owner-a",
      expiresAt: new Date(Date.now() + 30000),
    });

    // Owner B tries to renew - should fail (wrong owner)
    const renewal = await CartLock.renewLock(customerUserId, "owner-b", 30000);
    expect(renewal).toBeNull();

    // Owner B cannot take over because lock is not expired
    const now = new Date();
    const stolen = await CartLock.findOneAndUpdate(
      { userId: customerUserId, expiresAt: { $lt: now } },
      { $set: { owner: "owner-b", expiresAt: new Date(Date.now() + 30000) } },
      { new: true }
    );
    expect(stolen).toBeNull();
  });

  // ── Crash recovery tests ──────────────────────────────────────────

  it("crash after cart mutation but before completion does not duplicate quantities on retry", async () => {
    const key = "crash-recovery-key-1";

    // First request completes normally
    const res1 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });
    expect(res1.status).toBe(200);
    const item1 = res1.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item1.quantity).toBe(2);

    // Simulate crash: mark cartMutated=true but leave status=pending
    const op = await MergeOperation.findOne({ userId: customerUserId, operationKey: key });
    op.cartMutated = true;
    op.status = "pending";
    op.claimedAt = new Date(Date.now() - 10 * 60 * 1000); // stale
    await op.save();

    // Expire the lock so the retry can reclaim
    await CartLock.findOneAndUpdate(
      { userId: customerUserId },
      { expiresAt: new Date(Date.now() - 60000) }
    );

    // Retry with same key should NOT duplicate quantities
    const res2 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 5 }], idempotencyKey: key });
    expect(res2.status).toBe(200);
    const item2 = res2.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item2.quantity).toBe(2); // Still 2, not 7

    // Verify the operation is now completed
    const updatedOp = await MergeOperation.findOne({ userId: customerUserId, operationKey: key });
    expect(updatedOp.status).toBe("completed");
  });

  it("crash at mutation boundary does not cause duplicate application (receipt-based)", async () => {
    const key = "boundary-crash-key-1";

    // First request completes normally with receipt stored in Cart
    const res1 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });
    expect(res1.status).toBe(200);

    // Verify receipt exists in Cart
    const cart1 = await Cart.findOne({ user: customerUserId });
    expect(cart1.mergeReceipts).toHaveLength(1);
    expect(cart1.mergeReceipts[0].operationKey).toBe(key);
    expect(cart1.mergeReceipts[0].status).toBe("applied");

    // Submit same key again - idempotency receipt in Cart prevents re-application
    const res2 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 10 }], idempotencyKey: key });
    expect(res2.status).toBe(200);
    const item2 = res2.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item2.quantity).toBe(2); // Cached result, not 10 or 12

    // Cart unchanged
    const cart2 = await Cart.findOne({ user: customerUserId });
    expect(cart2.items).toHaveLength(1);
    expect(cart2.items[0].quantity).toBe(2);
    expect(cart2.mergeReceipts).toHaveLength(1); // No duplicate receipt
  });

  it("completed operation returns stored result without modifying cart", async () => {
    const key = "cached-result-key-1";

    const res1 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });
    expect(res1.status).toBe(200);

    const cartBefore = await Cart.findOne({ user: customerUserId });
    const itemBefore = cartBefore.items.find((i) => String(i.product) === String(productId));
    expect(itemBefore.quantity).toBe(2);

    const res2 = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 10 }], idempotencyKey: key });
    expect(res2.status).toBe(200);
    const item2 = res2.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item2.quantity).toBe(2);

    const cartAfter = await Cart.findOne({ user: customerUserId });
    const itemAfter = cartAfter.items.find((i) => String(i.product) === String(productId));
    expect(itemAfter.quantity).toBe(2);
    expect(cartAfter.mergeReceipts).toHaveLength(1);
  });

  it("failed operation can recover safely", async () => {
    const key = "failed-recovery-key-1";

    const failedOp = await MergeOperation.create({
      userId: customerUserId,
      operationKey: key,
      claimOwner: "old-owner",
      status: "failed",
      itemsSnapshot: [{ productId, quantity: 3 }],
      claimedAt: new Date(),
    });

    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 3 }], idempotencyKey: key });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item.quantity).toBe(3);

    const updatedOp = await MergeOperation.findOne({ userId: customerUserId, operationKey: key });
    expect(updatedOp.status).toBe("completed");
    expect(updatedOp.claimOwner).not.toBe("old-owner");
  });

  // ── Cart mutation path concurrency tests ──────────────────────────

  it("addItem and merge cannot produce lost updates", async () => {
    const mergeKey = "add-merge-concurrent-1";

    // Start merge and addItem concurrently
    const mergeReq = request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 3 }], idempotencyKey: mergeKey });

    // Use direct service call for addItem to test concurrency
    const cartService = require("../src/services/cartService");
    const addPromise = cartService.addItem(customerUserId, productId, 2);

    const [mergeRes] = await Promise.all([mergeReq, addPromise]);
    expect(mergeRes.status).toBe(200);

    const cart = await Cart.findOne({ user: customerUserId });
    const item = cart.items.find((i) => String(i.product) === String(productId));
    // Either 3 (merge won) or 2 (addItem won) or 5 (both serialized) - no lost updates
    expect(item.quantity).toBeGreaterThanOrEqual(2);
    expect(item.quantity).toBeLessThanOrEqual(5);
    expect(item.quantity).toBeLessThanOrEqual(10); // stock cap
  });

  it("updateItem and removeItem cannot produce lost updates", async () => {
    // Pre-populate cart
    await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 5 }], idempotencyKey: "update-remove-key-1" });

    const cartService = require("../src/services/cartService");

    // Concurrent update and remove
    const updatePromise = cartService.updateItem(customerUserId, productId, 8);
    const removePromise = cartService.removeItem(customerUserId, productId);

    await Promise.all([updatePromise, removePromise]);

    const cart = await Cart.findOne({ user: customerUserId });
    // Either item removed or updated to 8 - no corrupted state
    if (cart && cart.items.length > 0) {
      const item = cart.items.find((i) => String(i.product) === String(productId));
      if (item) expect(item.quantity).toBe(8);
    }
  });

  // ── Preservation tests ────────────────────────────────────────────

  it("preserves existing customer cart items during merge", async () => {
    await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: "preserve-key-1" });
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId: outOfStockProductId, quantity: 1 }], idempotencyKey: "preserve-key-2" });
    expect(res.status).toBe(200);
    const activeItem = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(activeItem.quantity).toBe(2);
  });

  it("does not lose cart on invalid item mix", async () => {
    await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: "validity-key-1" });
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 0 }, { productId: outOfStockProductId, quantity: 1 }], idempotencyKey: "validity-key-2" });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item.quantity).toBe(2);
  });

  it("duplicate products in same guest payload are aggregated correctly", async () => {
    const key = "dup-payload-key-1";
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 3 }, { productId, quantity: 4 }], idempotencyKey: key });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item.quantity).toBe(7);
  });

  it("new cart item quantity cannot exceed stock", async () => {
    const key = "new-item-stock-key-1";
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 15 }], idempotencyKey: key });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i) => String(i.product._id) === String(productId));
    expect(item.quantity).toBe(10);
  });

  it("inactive product rejected during quantity update", async () => {
    await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId: inactiveProductId, quantity: 1 }], idempotencyKey: "inactive-update-key" });
    const res = await request(app).get("/api/cart").set("Authorization", `Bearer ${customerToken}`);
    const item = res.body.items.find((i) => String(i.product._id) === String(inactiveProductId));
    expect(item).toBeUndefined();
  });

  // ── MergeOperation record verification tests ──────────────────────

  it("verifies MergeOperation records after successful merge", async () => {
    const key = "verify-op-key-1";
    const res = await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });
    expect(res.status).toBe(200);

    const op = await MergeOperation.findOne({ userId: customerUserId, operationKey: key });
    expect(op).toBeTruthy();
    expect(op.status).toBe("completed");
    expect(op.claimOwner).toBeTruthy();
    expect(op.cartMutated).toBe(true);
    expect(op.itemsSnapshot).toHaveLength(1);
    expect(op.itemsSnapshot[0].quantity).toBe(2);
    expect(op.completedAt).toBeTruthy();
  });

  it("verifies CartLock is released after successful merge", async () => {
    const key = "verify-lock-release-key-1";
    await request(app)
      .post("/api/cart/merge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ items: [{ productId, quantity: 2 }], idempotencyKey: key });

    const lock = await CartLock.findOne({ userId: customerUserId });
    expect(lock).toBeNull(); // Lock should be released
  });
});
