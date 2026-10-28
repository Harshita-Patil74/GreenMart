const Cart = require("../models/Cart");
async function getCart(userId){ return Cart.findOne({ user: userId }).populate("items.product"); }
async function addItem(userId, productId, qty){
  let cart = await Cart.findOne({ user: userId });
  if(!cart) cart = await Cart.create({ user: userId, items: [] });
  const idx = cart.items.findIndex(i=>String(i.product)===String(productId));
  if(idx>-1) cart.items[idx].quantity += qty; else cart.items.push({ product: productId, quantity: qty });
  await cart.save();
  return cart.populate("items.product");
}
async function updateItem(userId, productId, qty){
  const cart = await Cart.findOne({ user: userId });
  const idx = cart.items.findIndex(i=>String(i.product)===String(productId));
  if(idx>-1){ if(qty<=0) cart.items.splice(idx,1); else cart.items[idx].quantity=qty; }
  await cart.save();
  return cart.populate("items.product");
}
async function removeItem(userId, productId){
  const cart = await Cart.findOne({ user: userId });
  cart.items = cart.items.filter(i=>String(i.product)!==String(productId));
  await cart.save();
  return cart.populate("items.product");
}
async function clearCart(userId){ await Cart.deleteOne({ user: userId }); }
module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
