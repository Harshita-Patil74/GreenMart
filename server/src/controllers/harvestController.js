const Harvest = require("../models/Harvest");
const { asyncHandler } = require("../utils/asyncHandler");

exports.create = asyncHandler(async (req,res) => {
  const h = await Harvest.create({ ...req.body, farmer: req.user._id });
  res.status(201).json(h);
});
exports.list = asyncHandler(async (req,res) => {
  const h = await Harvest.find({ farmer: req.user._id }).sort({ createdAt: -1 });
  res.json(h);
});
exports.getOne = asyncHandler(async (req,res) => {
  const h = await Harvest.findOne({ _id: req.params.harvestId, farmer: req.user._id });
  if (!h) return res.status(404).json({ message: "Harvest not found" });
  res.json(h);
});
exports.update = asyncHandler(async (req,res) => {
  const h = await Harvest.findOneAndUpdate({ _id: req.params.harvestId, farmer: req.user._id }, req.body, { new: true, runValidators: true });
  if (!h) return res.status(404).json({ message: "Harvest not found" });
  res.json(h);
});
exports.updateAvailability = asyncHandler(async (req,res) => {
  const { availableQuantity, saleStatus } = req.body;
  const h = await Harvest.findOneAndUpdate({ _id: req.params.harvestId, farmer: req.user._id }, { availableQuantity, saleStatus }, { new: true, runValidators: true });
  if (!h) return res.status(404).json({ message: "Harvest not found" });
  res.json(h);
});
exports.remove = asyncHandler(async (req,res) => {
  const h = await Harvest.findOneAndDelete({ _id: req.params.harvestId, farmer: req.user._id });
  if (!h) return res.status(404).json({ message: "Harvest not found" });
  res.json({ message: "Deleted" });
});
module.exports = exports;
