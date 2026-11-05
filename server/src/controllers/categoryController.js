const Category = require("../models/Category");
const Product = require("../models/Product");
const { asyncHandler } = require("../utils/asyncHandler");

const ICON_ALLOWLIST = new Set([
  "Sprout", "Apple", "Wheat", "Milk", "Leaf", "Recycle", "Nut", "Vegan",
  "Droplet", "Droplets", "Cherry", "Package", "ChefHat", "Coffee", "Egg",
  "Fish", "Flame", "Pizza", "Sandwich", "Soup", "Star", "TreePine", "Wine",
]);

function sanitizeIcon(icon) {
  if (!icon) return undefined;
  if (typeof icon !== "string") return undefined;
  const trimmed = icon.trim();
  if (!trimmed || !ICON_ALLOWLIST.has(trimmed)) return undefined;
  return trimmed;
}

exports.list = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === "admin";
  const query = isAdmin ? {} : { isActive: true };
  const categories = await Category.find(query).sort({ name: 1 });
  res.json(categories);
});

exports.create = asyncHandler(async (req, res) => {
  let { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Category name is required" });
  }
  name = String(name).trim();
  const icon = sanitizeIcon(req.body.icon);
  const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i") } });
  if (existing) {
    return res.status(409).json({ message: "A category with this name already exists" });
  }
  const category = await Category.create({ name, icon, isActive: true });
  res.status(201).json(category);
});

exports.update = asyncHandler(async (req, res) => {
  let { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Category name is required" });
  }
  name = String(name).trim();
  const icon = sanitizeIcon(req.body.icon);
  const existing = await Category.findOne({
    _id: { $ne: req.params.id },
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i") },
  });
  if (existing) {
    return res.status(409).json({ message: "A category with this name already exists" });
  }
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });
  const oldName = category.name;
  const updated = await Category.findByIdAndUpdate(req.params.id, { name, icon }, { new: true });
  // Safely update all products using the old category name to the new name
  if (oldName !== name) {
    await Product.updateMany({ category: oldName }, { $set: { category: name } });
  }
  res.json(updated);
});

exports.remove = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });
  const productCount = await Product.countDocuments({ category: category.name });
  if (productCount > 0) {
    return res.status(400).json({ message: `Cannot delete category "${category.name}": ${productCount} product(s) still use it.` });
  }
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: "ok" });
});

exports.toggleActive = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });
  const updated = await Category.findByIdAndUpdate(req.params.id, { isActive: !category.isActive }, { new: true });
  res.json(updated);
});

module.exports = exports;
