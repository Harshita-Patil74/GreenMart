const Product = require("../models/Product");
const Harvest = require("../models/Harvest");
const InventoryAdjustment = require("../models/InventoryAdjustment");
const { asyncHandler } = require("../utils/asyncHandler");

exports.createAdjustment = asyncHandler(async (req,res) => {
  const { sourceType, sourceId, adjustmentType, quantity, unit, reason, notes } = req.body;
  if (!["Increase","Decrease"].includes(adjustmentType)) return res.status(400).json({ message: "Invalid type" });
  if (quantity <= 0) return res.status(400).json({ message: "Invalid quantity" });
  let item, prev, field;
  if (sourceType === "Product") {
    item = await Product.findOne({ _id: sourceId, farmer: req.user._id });
    if (!item) return res.status(404).json({ message: "Product not found" });
    prev = Number(item.stock) || 0;
    field = "stock";
  } else if (sourceType === "Harvest") {
    item = await Harvest.findOne({ _id: sourceId, farmer: req.user._id });
    if (!item) return res.status(404).json({ message: "Harvest not found" });
    prev = Number(item.availableQuantity) || 0;
    field = "availableQuantity";
  } else {
    return res.status(400).json({ message: "Invalid source" });
  }
  let next = adjustmentType === "Increase" ? prev + quantity : prev - quantity;
  if (next < 0) return res.status(400).json({ message: "Insufficient stock" });
  if (field === "stock") item.stock = next; else item.availableQuantity = next;
  await item.save();
  const adj = await InventoryAdjustment.create({ farmer: req.user._id, sourceType, sourceId, adjustmentType, quantity, unit, previousAvailableQuantity: prev, newAvailableQuantity: next, reason, notes, adjustedBy: req.user._id });
  res.status(201).json(adj);
});
exports.historyForItem = asyncHandler(async (req,res) => {
  const list = await InventoryAdjustment.find({ farmer: req.user._id, sourceId: req.params.inventoryId }).sort({ createdAt: -1 });
  res.json(list);
});
exports.historyAll = asyncHandler(async (req,res) => {
  const list = await InventoryAdjustment.find({ farmer: req.user._id }).sort({ createdAt: -1 });
  res.json(list);
});
module.exports = exports;
