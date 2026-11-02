const Crop = require("../models/Crop");
const { asyncHandler } = require("../utils/asyncHandler");

exports.create = asyncHandler(async (req,res) => {
  const crop = await Crop.create({ ...req.body, farmer: req.user._id });
  res.status(201).json(crop);
});
exports.list = asyncHandler(async (req,res) => {
  const crops = await Crop.find({ farmer: req.user._id }).sort({ createdAt: -1 });
  res.json(crops);
});
exports.getOne = asyncHandler(async (req,res) => {
  const crop = await Crop.findOne({ _id: req.params.cropId, farmer: req.user._id });
  if (!crop) return res.status(404).json({ message: "Crop not found" });
  res.json(crop);
});
exports.update = asyncHandler(async (req,res) => {
  const crop = await Crop.findOneAndUpdate({ _id: req.params.cropId, farmer: req.user._id }, req.body, { new: true, runValidators: true });
  if (!crop) return res.status(404).json({ message: "Crop not found" });
  res.json(crop);
});
exports.remove = asyncHandler(async (req,res) => {
  const crop = await Crop.findOneAndDelete({ _id: req.params.cropId, farmer: req.user._id });
  if (!crop) return res.status(404).json({ message: "Crop not found" });
  res.json({ message: "Deleted" });
});
module.exports = exports;
