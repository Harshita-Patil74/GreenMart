const Address = require("../models/Address");
const { asyncHandler } = require("../utils/asyncHandler");
exports.list = asyncHandler(async (req,res) => res.json(await Address.find({ user: req.user._id })));
exports.create = asyncHandler(async (req,res) => res.status(201).json(await Address.create({ ...req.body, user: req.user._id })));
exports.update = asyncHandler(async (req,res) => res.json(await Address.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true })));
exports.remove = asyncHandler(async (req,res) => { await Address.deleteOne({ _id: req.params.id, user: req.user._id }); res.json({ message: "ok" }); });
module.exports = exports;
