const Wishlist = require("../models/Wishlist");
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
  if (idx>-1) w.products.splice(idx,1); else w.products.push(req.body.productId);
  await w.save();
  res.json(w);
});
module.exports = exports;
