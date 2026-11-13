const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Setting = require("../models/Setting");
const { enrichCart, computeCartTotals } = require("./offerService");
const { isPremiumCustomer } = require("./premiumService");
const mongoose = require("mongoose");

function invalidQuantityError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeQuantity(qty) {
  const n = Number(qty);
  if (!Number.isInteger(n)) throw invalidQuantityError("Enter a valid whole-number quantity.");
  if (n < 1) throw invalidQuantityError("Quantity must be at least 1.");
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
  const product = await Product.findById(productId).select("stock status");
  if (!product || product.status !== "Active") {
    throw Object.assign(new Error("This product is no longer available."), { status: 409 });
  }
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  const idx = cart.items.findIndex((i) => String(i.product) === String(productId));
  const nextQty = idx > -1 ? Number(cart.items[idx].quantity || 0) + quantity : quantity;
  if (nextQty > product.stock) throw Object.assign(new Error("Insufficient stock"), { status: 409 });
  if (idx > -1) cart.items[idx].quantity = nextQty;
  else cart.items.push({ product: productId, quantity });
  await cart.save();
  return populatedCart(cart, userId);
}

async function updateItem(userId, productId, qty) {
  const quantity = normalizeQuantity(qty);
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return withTotals(null, userId);
  const idx = cart.items.findIndex((i) => String(i.product) === String(productId));
  if (idx > -1) {
    const product = await Product.findById(productId).select("stock");
    if (product && quantity > product.stock) throw Object.assign(new Error("Insufficient stock"), { status: 409 });
    cart.items[idx].quantity = quantity;
  }
  await cart.save();
  return populatedCart(cart, userId);
}

async function removeItem(userId, productId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return withTotals(null, userId);
  cart.items = cart.items.filter((i) => String(i.product) !== String(productId));
  await cart.save();
  return populatedCart(cart, userId);
}

async function clearCart(userId) {
  await Cart.deleteOne({ user: userId });
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
