const Product = require("../models/Product");
const User = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");

async function listProducts(req, res, activeOnly) {
  const { search, category, minPrice, maxPrice, inStock, sort, page=1, limit=12 } = req.query;
  const q = activeOnly ? { status: "Active" } : {};
  if (search) q.$text = { $search: search };
  if (category && category !== "All Products") q.category = category;
  if (minPrice||maxPrice) { q.price = {}; if(minPrice) q.price.$gte=Number(minPrice); if(maxPrice) q.price.$lte=Number(maxPrice); }
  if (inStock === "true") q.stock = { $gt: 0 };
  if (req.query.farmer) q.farmer = req.query.farmer;
  let sortObj = { createdAt: -1 };
  if (sort === "price_asc") sortObj = { price: 1 };
  if (sort === "price_desc") sortObj = { price: -1 };
  if (sort === "rating") sortObj = { ratingAverage: -1 };
  const skip = (Number(page)-1)*Number(limit);
  const [items, total] = await Promise.all([Product.find(q).sort(sortObj).skip(skip).limit(Number(limit)).populate("farmer","name"), Product.countDocuments(q)]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total/Number(limit)) });
}
exports.list = asyncHandler(async (req,res) => listProducts(req, res, false));
exports.storefront = asyncHandler(async (req,res) => listProducts(req, res, true));
exports.storefrontGet = asyncHandler(async (req,res) => {
  const p = await Product.findOne({ _id: req.params.id, status: "Active" }).populate("farmer","name");
  if (!p) return res.status(404).json({ message: "Not found" });
  res.json(p);
});
exports.mine = asyncHandler(async (req,res) => {
  const items = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
});
exports.get = asyncHandler(async (req,res) => {
  const p = await Product.findById(req.params.id).populate("farmer","name");
  if (!p) return res.status(404).json({ message: "Not found" });
  res.json(p);
});
exports.create = asyncHandler(async (req,res) => {
  let farmerId = req.user._id;
  if (req.user.role === "admin") {
    if (!req.body.farmer) return res.status(400).json({ message: "Select a farmer for this product" });
    const farmer = await User.findOne({ _id: req.body.farmer, role: "farmer" });
    if (!farmer) return res.status(400).json({ message: "Selected farmer account is invalid" });
    farmerId = farmer._id;
  }
  if (!req.body.name || !req.body.category || !req.body.description || !String(req.body.description).trim()) return res.status(400).json({ message: "Name, category, and description are required" });
  const data = {
    name: req.body.name,
    description: String(req.body.description).trim(),
    category: req.body.category,
    price: req.body.price,
    unit: req.body.unit,
    stock: req.body.stock,
    lowStockThreshold: req.body.lowStockThreshold,
    harvestDate: req.body.harvestDate,
    seasonalAvailability: req.body.seasonalAvailability,
    isOrganic: req.body.isOrganic,
    farmer: farmerId,
    images: req.files ? req.files.map(f=>"/uploads/products/"+f.filename) : [],
  };
  const p = await Product.create(data);
  res.status(201).json(p);
});
exports.update = asyncHandler(async (req,res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  if (req.user.role !== "admin" && String(p.farmer) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  if (req.body.status !== undefined && !["Active", "Inactive"].includes(req.body.status)) {
    return res.status(400).json({ message: "Status must be Active or Inactive" });
  }
  if (req.body.description !== undefined) {
    const desc = String(req.body.description).trim();
    if (!desc || desc.length > 1000) return res.status(400).json({ message: "Description is required and must be 1000 characters or fewer" });
    req.body.description = desc;
  }
  const allowed = ["name","description","category","price","unit","stock","lowStockThreshold","harvestDate","seasonalAvailability","isOrganic","status"];
  for (const k of allowed) if (req.body[k] !== undefined) p[k] = req.body[k];
  if (req.files && req.files.length) p.images = req.files.map(f=>"/uploads/products/"+f.filename);
  await p.save();
  res.json(p);
});
exports.remove = asyncHandler(async (req,res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  if (req.user.role !== "admin" && String(p.farmer) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  await p.deleteOne();
  res.json({ message: "Deleted" });
});
