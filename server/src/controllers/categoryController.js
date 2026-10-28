const Category = require("../models/Category");
const { asyncHandler } = require("../utils/asyncHandler");
exports.list = asyncHandler(async (req,res) => res.json(await Category.find()));
exports.create = asyncHandler(async (req,res) => res.status(201).json(await Category.create(req.body)));
exports.update = asyncHandler(async (req,res) => res.json(await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })));
exports.remove = asyncHandler(async (req,res) => { await Category.findByIdAndDelete(req.params.id); res.json({ message: "ok" }); });
module.exports = exports;
