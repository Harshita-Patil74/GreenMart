const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Setting = require("../models/Setting");
const MergeOperation = require("../models/MergeOperation");
const CartLock = require("../models/CartLock");
const { enrichCart, computeCartTotals } = require("./offerService");
const { isPremiumCustomer } = require("./premiumService");
const mongoose = require("mongoose");
const crypto = require("crypto");

function invalidQuantityError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeQuantity(qty) {
  const n = Number(qty);
  if (!Number.isInteger(n)) throw invalidQuantityError("Enter a valid whole-number quantity.");
  if (n < 1) throw invalidQuantityError("Quantity must be at least 1.");
  return n;
}

function resolveProductId(guestItem) {
  if (!guestItem || typeof guestItem !== "object") return null;
  return guestItem.productId
    || (guestItem.product && (guestItem.product._id || guestItem.product.id || guestItem.product))
    || guestItem.id
    || null;
}

function resolveQuantity(guestItem) {
  if (!guestItem || typeof guestItem !== "object") return null;
  const raw = guestItem.quantity;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < 1) return null;
  return n;
}

async function withTotals(cart, userId) {
  const premium = userId ? await isPremiumCustomer(userId) : false;
  const enriched = cart ? await enrichCart(cart, premium) : { items: [] };
  const setting = await Setting.findOne();
  const deliveryCharge = setting && setting.deliveryCharge != null ? Number(setting.deliveryCharge) : 30;
  if (!Number.isFinite(deliveryCharge) || deliveryCharge < 0) {
    throw new Error("The delivery charge is temporarily unavailable.");
  }
  return {
    ...enriched,
    items: enriched.items || [],
    ...computeCartTotals(enriched.items || [], deliveryCharge),
  };
}

async function populatedCart(cart, userId) {
  if (!cart) return withTotals(null, userId);
  return withTotals(await cart.populate("items.product"), userId);
}

async function getCart(userId) {
  return populatedCart(await Cart.findOne({ user: userId }), userId);
}

async function addItem(userId, productId, qty) {
  const quantity = normalizeQuantity(qty);
  if (!mongoose.isValidObjectId(productId)) {
    throw Object.assign(new Error("Product not found."), { status: 404 });
  }
  const product = await Product.findById(productId).select("stock status isDeleted");
  if (!product || product.isDeleted || product.status !== "Active") {
    throw Object.assign(new Error("This product is no longer available."), { status: 409 });
  }

  const lock = await acquireCartLock(userId, 30000);
  if (!lock.acquired) {
    throw Object.assign(new Error("Cart is temporarily locked by another operation. Please retry."), { status: 409, code: "CART_LOCKED" });
  }

  try {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      const upsertRes = await Cart.findOneAndUpdate(
        { user: userId },
        { $setOnInsert: { user: userId, items: [], mergeReceipts: [] } },
        { upsert: true, new: true }
      );
      if (!upsertRes) throw Object.assign(new Error("Failed to create cart."), { status: 500 });
      cart = upsertRes;
    }
    const idx = cart.items.findIndex((i) => String(i.product) === String(productId));
    const nextQty = idx > -1 ? Number(cart.items[idx].quantity || 0) + quantity : quantity;
    if (nextQty > product.stock) throw Object.assign(new Error("Insufficient stock"), { status: 409 });
    if (idx > -1) cart.items[idx].quantity = nextQty;
    else cart.items.push({ product: productId, quantity });
    await cart.save();
    return populatedCart(cart, userId);
  } finally {
    await releaseCartLock(userId, lock.owner);
  }
}

async function updateItem(userId, productId, qty) {
  const quantity = normalizeQuantity(qty);
  if (!mongoose.isValidObjectId(productId)) {
    throw Object.assign(new Error("Product not found."), { status: 404 });
  }

  const lock = await acquireCartLock(userId, 30000);
  if (!lock.acquired) {
    throw Object.assign(new Error("Cart is temporarily locked by another operation. Please retry."), { status: 409, code: "CART_LOCKED" });
  }

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return withTotals(null, userId);
    const idx = cart.items.findIndex((i) => String(i.product) === String(productId));
    if (idx > -1) {
      const product = await Product.findById(productId).select("stock isDeleted status");
      if (!product || product.isDeleted || product.status !== "Active") {
        throw Object.assign(new Error("This product is no longer available."), { status: 409 });
      }
      if (quantity > product.stock) throw Object.assign(new Error("Insufficient stock"), { status: 409 });
      cart.items[idx].quantity = quantity;
    }
    await cart.save();
    return populatedCart(cart, userId);
  } finally {
    await releaseCartLock(userId, lock.owner);
  }
}

async function removeItem(userId, productId) {
  const lock = await acquireCartLock(userId, 30000);
  if (!lock.acquired) {
    throw Object.assign(new Error("Cart is temporarily locked by another operation. Please retry."), { status: 409, code: "CART_LOCKED" });
  }

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return withTotals(null, userId);
    cart.items = cart.items.filter((i) => String(i.product) !== String(productId));
    await cart.save();
    return populatedCart(cart, userId);
  } finally {
    await releaseCartLock(userId, lock.owner);
  }
}

async function clearCart(userId) {
  const lock = await acquireCartLock(userId, 30000);
  if (!lock.acquired) {
    throw Object.assign(new Error("Cart is temporarily locked by another operation. Please retry."), { status: 409, code: "CART_LOCKED" });
  }

  try {
    await Cart.deleteOne({ user: userId });
  } finally {
    await releaseCartLock(userId, lock.owner);
  }
}

/**
 * Acquire a per-customer cart mutation lock. Only one request can hold
 * the lock for a given userId at a time. Uses MongoDB unique index on
 * userId for atomic acquisition. Expired locks can be stolen. Waits and
 * retries if the lock is held by another active request.
 * Returns { acquired: true, owner, expiresAt } or { acquired: false }.
 */
async function acquireCartLock(userId, ttlMs = 30000, maxWaitMs = 5000) {
  const owner = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlMs);
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    try {
      await CartLock.create({ userId, owner, expiresAt });
      return { acquired: true, owner, expiresAt };
    } catch (err) {
      if (err.code === 11000) {
        const now = new Date();
        const stolen = await CartLock.findOneAndUpdate(
          { userId, expiresAt: { $lt: now } },
          { $set: { owner, expiresAt: new Date(Date.now() + ttlMs) } },
          { new: true }
        );
        if (stolen) return { acquired: true, owner: stolen.owner, expiresAt: stolen.expiresAt };
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      throw err;
    }
  }
  return { acquired: false, owner: null };
}

async function releaseCartLock(userId, owner) {
  await CartLock.deleteOne({ userId, owner }).catch(() => {});
}

/**
 * Atomically claim a merge operation for idempotency using a fencing
 * token (claimOwner). Only one request can process a given
 * userId + operationKey. Completed operations return cached results.
 * Stale pending operations (lock expired) can be reclaimed.
 * Never silently swallows persistence errors.
 */
async function claimOperation(userId, operationKey, items) {
  const claimOwner = crypto.randomUUID();
  const existing = await MergeOperation.findOne({ userId, operationKey });

  if (existing) {
    if (existing.status === "completed") {
      return { action: "return-cached", operation: existing, claimOwner: null };
    }
    if (existing.status === "failed") {
      existing.claimOwner = claimOwner;
      existing.status = "pending";
      existing.itemsSnapshot = items;
      existing.result = undefined;
      existing.cartMutated = false;
      existing.completedAt = undefined;
      existing.claimedAt = new Date();
      await existing.save();
      return { action: "process", operation: existing, claimOwner };
    }
    // status === "pending"
    // Defensive: same claimOwner retry (impossible with new UUID each time)
    if (existing.claimOwner === claimOwner) {
      return { action: "process", operation: existing, claimOwner: existing.claimOwner };
    }
    // Different owner: check if the CartLock is expired (previous owner crashed).
    const lock = await CartLock.findOne({ userId });
    const lockExpired = !lock || lock.expiresAt < new Date();
    if (lockExpired) {
      existing.claimOwner = claimOwner;
      existing.claimedAt = new Date();
      await existing.save();
      return { action: "process", operation: existing, claimOwner };
    }
    // Another request actively holds the lock and is processing.
    return { action: "wait", operation: existing, claimOwner: null };
  }

  try {
    const op = await MergeOperation.create({
      userId,
      operationKey,
      claimOwner,
      status: "pending",
      itemsSnapshot: items,
      claimedAt: new Date(),
    });
    return { action: "process", operation: op, claimOwner };
  } catch (err) {
    if (err.code === 11000) {
      const retry = await MergeOperation.findOne({ userId, operationKey });
      if (!retry) throw err;
      if (retry.status === "completed") return { action: "return-cached", operation: retry, claimOwner: null };
      if (retry.status === "failed") {
        retry.claimOwner = claimOwner;
        retry.status = "pending";
        retry.itemsSnapshot = items;
        retry.result = undefined;
        retry.cartMutated = false;
        retry.completedAt = undefined;
        retry.claimedAt = new Date();
        await retry.save();
        return { action: "process", operation: retry, claimOwner };
      }
      const lock = await CartLock.findOne({ userId });
      const lockExpired = !lock || lock.expiresAt < new Date();
      if (lockExpired) {
        retry.claimOwner = claimOwner;
        retry.claimedAt = new Date();
        await retry.save();
        return { action: "process", operation: retry, claimOwner };
      }
      return { action: "wait", operation: retry, claimOwner: null };
    }
    throw err;
  }
}

/**
 * Wait for a pending operation to complete (another request holds the lock).
 * Polls for up to maxWaitMs, returning the cached result if completed.
 */
async function waitForCompletion(userId, operationKey, maxWaitMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const op = await MergeOperation.findOne({ userId, operationKey });
    if (!op) return null;
    if (op.status === "completed") return op.result;
    if (op.status === "failed") return null;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

/**
 * After a wait timeout, attempt to re-claim a pending operation.
 * Re-checks: operation still pending AND lock expired.
 * Returns { action: "process", claimOwner } or { action: "wait" }
 * or { action: "return-cached", operation }.
 */
async function retryClaimAfterWait(userId, operationKey, items, originalClaimOwner) {
  const claimOwner = crypto.randomUUID();
  const op = await MergeOperation.findOne({ userId, operationKey });
  if (!op) throw new Error("Merge operation not found.");
  if (op.status === "completed") return { action: "return-cached", operation: op, claimOwner: null };
  if (op.status === "failed") {
    op.claimOwner = claimOwner;
    op.status = "pending";
    op.itemsSnapshot = items;
    op.result = undefined;
    op.cartMutated = false;
    op.completedAt = undefined;
    op.claimedAt = new Date();
    await op.save();
    return { action: "process", operation: op, claimOwner };
  }
  // status === "pending"
  const lock = await CartLock.findOne({ userId });
  const lockExpired = !lock || lock.expiresAt < new Date();
  if (lockExpired) {
    op.claimOwner = claimOwner;
    op.claimedAt = new Date();
    await op.save();
    return { action: "process", operation: op, claimOwner };
  }
  // Lock still held by another request.
  return { action: "wait", operation: op, claimOwner: null };
}

/**
 * Verify the operation's claimOwner still matches (fencing check).
 * Throws if ownership has been lost to another request.
 */
function assertOwnership(operation, claimOwner, context) {
  if (!operation || operation.claimOwner !== claimOwner) {
    throw Object.assign(
      new Error(`Lost ownership of merge operation during ${context}.`),
      { status: 409, code: "OWNERSHIP_LOST" }
    );
  }
}

/**
 * Atomic cart mutation with idempotency receipt.
 * Updates cart quantities and records the merge receipt in a single
 * MongoDB document update (single-document atomicity).
 */
async function mergeItems(userId, items, idempotencyKey) {
  // --- Validation ---
  if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    throw Object.assign(new Error("Idempotency key is required."), { status: 400 });
  }
  if (!Array.isArray(items)) {
    throw Object.assign(new Error("Items must be an array."), { status: 400 });
  }

  // --- Idempotency claim with fencing token ---
  const claim = await claimOperation(userId, idempotencyKey, items);
  if (claim.action === "return-cached") return claim.operation.result;
  if (claim.action === "wait") {
    const cached = await waitForCompletion(userId, idempotencyKey);
    if (cached) return cached;
    // Wait timed out: try to re-claim the operation.
    const retry = await retryClaimAfterWait(userId, idempotencyKey, items, null);
    if (retry.action === "return-cached") return retry.operation.result;
    if (retry.action === "wait") {
      throw Object.assign(
        new Error("Merge operation is still in progress. Please retry."),
        { status: 409, code: "CART_LOCKED" }
      );
    }
    // retry.action === "process"
    claim.action = "process";
    claim.claimOwner = retry.claimOwner;
    claim.operation = retry.operation;
  }
  const { claimOwner } = claim;

  // Empty items: mark operation completed without mutation.
  if (!items.length) {
    const cart = await Cart.findOne({ user: userId });
    const result = { ...(await populatedCart(cart, userId)), skipped: [] };
    const updateRes = await MergeOperation.findOneAndUpdate(
      { userId, operationKey: idempotencyKey, claimOwner },
      { $set: { status: "completed", result, completedAt: new Date() } }
    );
    if (!updateRes) {
      throw Object.assign(new Error("Failed to record merge completion."), { status: 500 });
    }
    return result;
  }

  // --- Validate item structure first (before lock) ---
  const skipped = [];
  const candidateItems = [];
  for (const guestItem of items) {
    const productId = resolveProductId(guestItem);
    const qty = resolveQuantity(guestItem);

    if (!productId || !mongoose.isValidObjectId(productId)) { skipped.push(productId); continue; }
    if (qty === null) { skipped.push(productId); continue; }

    candidateItems.push({ productId, qty });
  }

  // --- Acquire cart lock for serialized mutation ---
  const lock = await acquireCartLock(userId, 30000);
  if (!lock.acquired) {
    throw Object.assign(new Error("Cart is temporarily locked by another operation. Please retry."), { status: 409, code: "CART_LOCKED" });
  }

  let mutationResult;
  try {
    // Fencing: verify we still own the operation before mutating.
    const currentOp = await MergeOperation.findOne({ userId, operationKey: idempotencyKey });
    assertOwnership(currentOp, claimOwner, "cart mutation");

    // Read fresh cart state under the lock.
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      const upsertRes = await Cart.findOneAndUpdate(
        { user: userId },
        { $setOnInsert: { user: userId, items: [], mergeReceipts: [] } },
        { upsert: true, new: true }
      );
      if (!upsertRes) {
        throw Object.assign(new Error("Failed to create cart."), { status: 500 });
      }
      cart = upsertRes;
    }

    // Idempotency: check if this operation was already applied.
    const alreadyApplied = (cart.mergeReceipts || []).some(
      (r) => r.operationKey === idempotencyKey && r.status === "applied"
    );
    if (alreadyApplied) {
      const populated = await populatedCart(cart, userId);
      const result = { ...populated, skipped };
      // Mark MergeOperation completed too.
      await MergeOperation.findOneAndUpdate(
        { userId, operationKey: idempotencyKey, claimOwner },
        { $set: { status: "completed", result, completedAt: new Date(), cartMutated: true } }
      );
      return result;
    }

    // Revalidate product stock and status immediately before mutation.
    const validated = [];
    for (const { productId, qty } of candidateItems) {
      const product = await Product.findById(productId).select("stock status isDeleted");
      if (!product || product.isDeleted || product.status !== "Active") { skipped.push(productId); continue; }
      if (!Number.isFinite(product.stock) || product.stock <= 0) { skipped.push(productId); continue; }
      validated.push({ productId, qty, stock: product.stock });
    }

    // Aggregate duplicate products within the same payload.
    const aggregated = {};
    for (const { productId, qty, stock } of validated) {
      if (!aggregated[productId]) aggregated[productId] = { qty: 0, stock };
      aggregated[productId].qty += qty;
    }

    // Build new items array.
    const existingByProduct = {};
    (cart.items || []).forEach((item) => {
      existingByProduct[String(item.product)] = item;
    });

    const finalItems = [];
    const itemsToSkip = [];

    // Keep existing items not being modified.
    for (const item of cart.items || []) {
      const pid = String(item.product);
      if (aggregated[pid]) continue; // will be replaced below
      finalItems.push(item);
    }

    // Add/update items from the merge payload.
    for (const [productId, { qty, stock }] of Object.entries(aggregated)) {
      const existing = existingByProduct[productId];
      const currentQty = existing ? Number(existing.quantity || 0) : 0;
      const combined = currentQty + qty;
      const finalQty = Math.min(combined, stock);
      if (finalQty < 1) { itemsToSkip.push(productId); continue; }

      finalItems.push({ product: productId, quantity: finalQty });
    }

    // Merge skipped from validation with stock-capped skips.
    const allSkipped = [...skipped, ...itemsToSkip];

    // Build merge receipt.
    const receipt = {
      operationKey: idempotencyKey,
      status: "applied",
      itemsSnapshot: items,
      appliedAt: new Date(),
    };

    // Atomic single-document update: replace items array + push receipt.
    const updateRes = await Cart.findOneAndUpdate(
      { user: userId },
      {
        $set: { items: finalItems },
        $push: { mergeReceipts: receipt },
      },
      { new: true }
    );

    if (!updateRes) {
      throw Object.assign(new Error("Cart mutation update matched no document."), { status: 500 });
    }

    mutationResult = { cart: updateRes, skipped: allSkipped };

    // Mark cartMutated=true on MergeOperation (secondary crash recovery marker).
    await MergeOperation.findOneAndUpdate(
      { userId, operationKey: idempotencyKey, claimOwner },
      { $set: { cartMutated: true } }
    );
  } finally {
    await releaseCartLock(userId, lock.owner);
  }

  // Fencing: verify ownership still holds before completing.
  const currentOp2 = await MergeOperation.findOne({ userId, operationKey: idempotencyKey });
  assertOwnership(currentOp2, claimOwner, "operation completion");

  const populated = await populatedCart(mutationResult.cart, userId);
  const result = { ...populated, skipped: mutationResult.skipped };

  const updateRes = await MergeOperation.findOneAndUpdate(
    { userId, operationKey: idempotencyKey, claimOwner },
    { $set: { status: "completed", result, completedAt: new Date() } }
  );
  if (!updateRes) {
    throw Object.assign(new Error("Failed to record merge completion."), { status: 500 });
  }

  return result;
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, mergeItems };
