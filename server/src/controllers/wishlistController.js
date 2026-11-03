const Wishlist = require("../models/Wishlist");
const { createNotification } = require("../services/notificationService");
const { asyncHandler } = require("../utils/asyncHandler");
exports.get = asyncHandler(async (req,res) => {
  let w = await Wishlist.findOne({ user: req.user._id }).populate("products");
  if (!w) w = await Wishlist.create({ user: req.user._id, products: [] });
  res.json(w);
});
exports.toggle = asyncHandler(async (req,res) => {
  let w = await Wishlist.findOne({ user: req.user._id });
  if (!w) w = await Wishlist.create({ user: req.user._id, products: [] });
  const idx = w.products.findIndex(p=>String(p)===String(req.body.productId));
  const added = idx === -1;
  if (idx>-1) w.products.splice(idx,1); else w.products.push(req.body.productId);
  await w.save();
  let productName = "Product";
  try {
    const Product = require("../models/Product");
    const p = await Product.findById(req.body.productId).select("name");
    if (p && p.name) productName = p.name;
  } catch (e) {}
  await createNotification({
    userId: req.user._id,
    type: added ? "wishlistAdded" : "wishlistRemoved",
    category: "wishlist",
    title: added ? "Added to wishlist" : "Removed from wishlist",
    message: added ? `${productName} was added to your wishlist.` : `${productName} was removed from your wishlist.`,
    resourceType: "Product",
    resourceId: req.body.productId,
    eventKey: `${added ? "wishlist:added" : "wishlist:removed"}:${req.user._id}:${req.body.productId}`,
  });
  res.json(w);
});
module.exports = exports;
