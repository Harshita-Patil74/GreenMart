const Product = require("../models/Product");
const Harvest = require("../models/Harvest");
const { asyncHandler } = require("../utils/asyncHandler");

exports.list = asyncHandler(async (req,res) => {
  const products = await Product.find({ farmer: req.user._id });
  const harvests = await Harvest.find({ farmer: req.user._id });
  res.json({ products, harvests });
});
exports.getOne = asyncHandler(async (req,res) => {
  const product = await Product.findOne({ _id: req.params.inventoryId, farmer: req.user._id });
  if (product) return res.json({ source: "product", item: product });
  const harvest = await Harvest.findOne({ _id: req.params.inventoryId, farmer: req.user._id });
  if (harvest) return res.json({ source: "harvest", item: harvest });
  res.status(404).json({ message: "Inventory item not found" });
});
module.exports = exports;
