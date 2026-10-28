const FarmerProfile = require("../models/FarmerProfile");
const Product = require("../models/Product");
const { asyncHandler } = require("../utils/asyncHandler");
const { haversine } = require("../utils/haversine");

exports.list = asyncHandler(async (req,res) => {
  const profiles = await FarmerProfile.find().populate("user","name email avatar role");
  res.json(profiles);
});
exports.get = asyncHandler(async (req,res) => {
  const p = await FarmerProfile.findOne({ user: req.params.id }).populate("user","name email avatar");
  res.json(p);
});
exports.updateLocation = asyncHandler(async (req,res) => {
  const p = await FarmerProfile.findOneAndUpdate({ user: req.user._id }, { location: { lat: req.body.lat, lng: req.body.lng }, address: req.body.address }, { new: true, upsert: true });
  res.json(p);
});
exports.updateMe = asyncHandler(async (req,res) => {
  const allowed = {};
  for (const field of ["farmName", "category", "description", "address", "photo"]) {
    if (req.body[field] !== undefined) allowed[field] = req.body[field];
  }
  if (req.file) allowed.photo = `/uploads/farms/${req.file.filename}`;
  const p = await FarmerProfile.findOneAndUpdate({ user: req.user._id }, allowed, { new: true, upsert: true, runValidators: true });
  res.json(p);
});
module.exports = exports;
