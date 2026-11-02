const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { enrichCart } = require("./offerService");
async function populatedCart(cart) {
  if (!cart) return null;
  return enrichCart(await cart.populate("items.product"));
}
async function getCart(userId){ return populatedCart(await Cart.findOne({ user: userId })); }
async function addItem(userId, productId, qty){
  let cart = await Cart.findOne({ user: userId });
  if(!cart) cart = await Cart.create({ user: userId, items: [] });
  const product = await Product.findById(productId).select("stock");
  if(product && qty > product.stock) throw Object.assign(new Error("Insufficient stock"), { status: 409 });
  const idx = cart.items.findIndex(i=>String(i.product)===String(productId));
  if(idx>-1) cart.items[idx].quantity += qty; else cart.items.push({ product: productId, quantity: qty });
  await cart.save();
  return populatedCart(cart);
}
async function updateItem(userId, productId, qty){
  const cart = await Cart.findOne({ user: userId });
  const idx = cart.items.findIndex(i=>String(i.product)===String(productId));
  if(idx>-1){
    if(qty<=0) cart.items.splice(idx,1);
    else {
      const product = await Product.findById(productId).select("stock");
      if(product && qty > product.stock) throw Object.assign(new Error("Insufficient stock"), { status: 409 });
      cart.items[idx].quantity=qty;
    }
  }
  await cart.save();
  return populatedCart(cart);
}
async function removeItem(userId, productId){
  const cart = await Cart.findOne({ user: userId });
  cart.items = cart.items.filter(i=>String(i.product)!==String(productId));
  await cart.save();
  return populatedCart(cart);
}
async function clearCart(userId){ await Cart.deleteOne({ user: userId }); }
module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
