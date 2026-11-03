const Product = require("../models/Product");
const User = require("../models/User");
const Offer = require("../models/Offer");
const FarmerProfile = require("../models/FarmerProfile");
const Wishlist = require("../models/Wishlist");
const { asyncHandler } = require("../utils/asyncHandler");
const { uploadFile } = require("../services/cloudinaryUpload");
const { createNotification, EVENT_KEY_PREFIXES } = require("../services/notificationService");
const { attachProductOffers, getEffectiveStatus, money } = require("../services/offerService");

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
  const offerFilter = activeOnly && req.query.hasOffer === "true";
  const offerSort = activeOnly && sort === "discount_desc";
  if (offerFilter || offerSort) {
    const products = await Product.find(q).sort(sortObj).populate("farmer", "name");
    let items = await attachProductOffers(products);
    if (offerFilter) items = items.filter((product) => product.offer);
    if (offerSort) {
      items.sort((left, right) =>
        Number(right.offer?.discountPercent || 0) - Number(left.offer?.discountPercent || 0)
      );
    }
    const total = items.length;
    items = items.slice(skip, skip + Number(limit));
    return res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  }
  const [products, total] = await Promise.all([Product.find(q).sort(sortObj).skip(skip).limit(Number(limit)).populate("farmer","name"), Product.countDocuments(q)]);
  const items = activeOnly ? await attachProductOffers(products) : products;
  res.json({ items, total, page: Number(page), pages: Math.ceil(total/Number(limit)) });
}
exports.list = asyncHandler(async (req,res) => listProducts(req, res, false));
exports.storefront = asyncHandler(async (req,res) => listProducts(req, res, true));
exports.storefrontOffers = asyncHandler(async (req, res) => {
  const now = new Date();
  const offers = await Offer.find({
    status: "Active",
    isActive: true,
    endDate: { $gte: now },
  })
    .sort({ createdAt: -1 })
    .populate("farmer", "name")
    .populate({
      path: "product",
      select: "name description category price unit stock images status farmer isOrganic",
      populate: { path: "farmer", select: "name" },
    });

  const farmerIds = [...new Set(offers.map((offer) => String(offer.farmer?._id || offer.farmer)).filter(Boolean))];
  const [eligibleFarmers, verifiedProfiles] = await Promise.all([
    User.find({ _id: { $in: farmerIds }, role: "farmer", status: "active" }).select("_id"),
    FarmerProfile.find({
      user: { $in: farmerIds },
      "certification.verifiedByAdmin": true,
      "certification.rejectedByAdmin": { $ne: true },
    }).select("user"),
  ]);
  const activeFarmerIds = new Set(eligibleFarmers.map((farmer) => String(farmer._id)));
  const verifiedFarmerIds = new Set(verifiedProfiles.map((profile) => String(profile.user)));

  const items = offers.flatMap((offer) => {
    const product = offer.product;
    const farmerId = String(offer.farmer?._id || offer.farmer || "");
    if (!product || product.status !== "Active" ||
        String(product.farmer?._id || product.farmer || "") !== farmerId ||
        !activeFarmerIds.has(farmerId) ||
        !verifiedFarmerIds.has(farmerId) ||
        Number(product.stock) < Number(offer.minimumQuantity || 1)) return [];

    const effectiveStatus = getEffectiveStatus(offer, product, now);
    if (effectiveStatus !== "Active" && effectiveStatus !== "Scheduled") return [];
    const quantity = Math.max(1, Number(offer.minimumQuantity) || 1);
    const originalPrice = Number(product.price);
    const perUnitDiscount = offer.discountType === "Percentage"
      ? originalPrice * Number(offer.discountValue) / 100
      : Number(offer.discountValue);
    const discount = money(Math.min(
      originalPrice * quantity,
      perUnitDiscount * quantity,
      offer.maximumDiscount == null ? Number.POSITIVE_INFINITY : Number(offer.maximumDiscount)
    ));
    if (!Number.isFinite(originalPrice) || originalPrice <= 0 || !Number.isFinite(discount) || discount <= 0) return [];

    return [{
      ...offer.toObject(),
      product: product.toObject(),
      farmer: offer.farmer,
      effectiveStatus,
      originalPrice,
      offerPrice: money((originalPrice * quantity - discount) / quantity),
      discountAmount: money(discount / quantity),
      discountPercent: Math.round((discount / (originalPrice * quantity)) * 100),
    }];
  });

  res.json({ items });
});
exports.storefrontGet = asyncHandler(async (req,res) => {
  const p = await Product.findOne({ _id: req.params.id, status: "Active" }).populate("farmer","name");
  if (!p) return res.status(404).json({ message: "Not found" });
  res.json((await attachProductOffers([p]))[0]);
});
exports.mine = asyncHandler(async (req,res) => {
  const { search } = req.query;
  const query = { farmer: req.user._id };
  if (search && search.trim()) {
    query.$text = { $search: search.trim() };
  }
  const items = await Product.find(query).sort({ createdAt: -1 });
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
    images: req.files ? await Promise.all(req.files.map(f=>uploadFile(f.path, "greenmart/products"))) : [],
  };
  const p = await Product.create(data);
  // Notify all admins about the new product
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin._id,
      type: "newProductAdmin",
      category: "products",
      title: "New product added",
      message: `A farmer has added ${data.name} to the marketplace.`,
      resourceType: "Product",
      resourceId: p._id,
    });
  }
  // Notify the farmer when an admin created the product on their behalf
  if (req.user.role === "admin" && String(farmerId) !== String(req.user._id)) {
    await createNotification({
      userId: farmerId,
      type: "productCreatedByAdmin",
      category: "products",
      title: "New product added",
      message: `The administrator added ${data.name} to your farm products.`,
      resourceType: "Product",
      resourceId: p._id,
      eventKey: `product:created-admin:${p._id}`,
    });
  }
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
  const oldStock = p.stock;
  const set = {};
  const allowed = ["name","description","category","price","unit","stock","lowStockThreshold","harvestDate","seasonalAvailability","isOrganic","status"];
  for (const k of allowed) {
    if (req.body[k] !== undefined) set[k] = req.body[k];
  }
  // Validate stock-only update values before persisting
  if (set.stock !== undefined) {
    const stockNum = Number(set.stock);
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      return res.status(400).json({ message: "Stock must be a valid non-negative number." });
    }
  }
  if (set.lowStockThreshold !== undefined) {
    const thresholdNum = Number(set.lowStockThreshold);
    if (!Number.isFinite(thresholdNum) || thresholdNum < 0) {
      return res.status(400).json({ message: "Low stock threshold must be a valid non-negative number." });
    }
  }
  if (req.files && req.files.length) {
    set.images = await Promise.all(req.files.map(f=>uploadFile(f.path, "greenmart/products")));
  }
  // Targeted update: only fields explicitly provided are sent to MongoDB.
  // Legacy products with a null description are never touched, so stock-only
  // updates pass validation without modifying unrelated fields.
  const updated = await Product.findByIdAndUpdate(req.params.id, { $set: set }, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ message: "Not found" });
  // Notify admins of important product updates
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
  // Stock transition to low stock or out of stock
  if (set.stock !== undefined) {
    const newStock = Number(updated.stock);
    const threshold = Number(updated.lowStockThreshold || 0);
    const wasLowOrOut = Number(oldStock) <= threshold;
    const isLowOrOut = newStock <= threshold;
    if (!wasLowOrOut && isLowOrOut) {
      const title = newStock === 0 ? "Product out of stock" : "Product low stock";
      const message = newStock === 0
        ? `${updated.name} is now out of stock.`
        : `${updated.name} has reached its low-stock threshold (${newStock} remaining).`;
      for (const admin of admins) {
        await createNotification({
          userId: admin._id,
          type: "stockAlert",
          category: "inventory",
          title,
          message,
          resourceType: "Product",
          resourceId: updated._id,
          eventKey: `${EVENT_KEY_PREFIXES.stockAlert}:${updated._id}`,
        });
      }
      // Notify the owning farmer of low stock or out of stock on their product
      const farmerId = String(updated.farmer || updated.product?.farmer || "");
      if (farmerId && farmerId !== "") {
        await createNotification({
          userId: farmerId,
          type: "stockAlert",
          category: "inventory",
          title,
          message: `Your ${updated.name} ${newStock === 0 ? "is now out of stock." : `has reached its low-stock threshold (${newStock} remaining).`}`,
          resourceType: "Product",
          resourceId: updated._id,
          icon: "AlertTriangle",
          priority: newStock === 0 ? "high" : "normal",
          actionUrl: `/farmer/inventory/${updated._id}`,
          eventKey: `${EVENT_KEY_PREFIXES.stockAlert}:${updated._id}:farmer:${farmerId}`,
        });
      }
    }
    // Notify wishlist customers when a previously out-of-stock product is back in stock
    if (Number(oldStock) === 0 && newStock > 0) {
      const wishlists = await Wishlist.find({ products: updated._id }).populate("user", "_id name email");
      for (const wishlist of wishlists) {
        if (wishlist.user) {
          await createNotification({
            userId: wishlist.user._id,
            type: "backInStock",
            category: "inventory",
            title: "Product back in stock",
            message: `${updated.name} is back in stock.`,
            resourceType: "Product",
            resourceId: updated._id,
            actionUrl: `/product/${updated._id}`,
            icon: "PackageCheck",
            priority: "normal",
            eventKey: `${EVENT_KEY_PREFIXES.backInStock}:${updated._id}:${wishlist.user._id}`,
          });
        }
      }
    }
  }
  // Notify the owning farmer when an admin edits their product
  if (req.user.role === "admin" && String(updated.farmer) !== String(req.user._id)) {
    await createNotification({
      userId: updated.farmer,
      type: "productUpdatedByAdmin",
      category: "products",
      title: "Product updated",
      message: `The administrator updated ${updated.name}.`,
      resourceType: "Product",
      resourceId: updated._id,
      eventKey: `product:updated-admin:${updated._id}`,
    });
  }
  res.json(updated);
});
exports.remove = asyncHandler(async (req,res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  if (req.user.role !== "admin" && String(p.farmer) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  const productName = p.name;
  const productId = p._id;
  await p.deleteOne();
  // Notify all admins about the deleted product
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin._id,
      type: "productDeletedAdmin",
      category: "products",
      title: "Product deleted",
      message: `The product "${productName}" has been deleted from the marketplace.`,
      resourceType: "Product",
      resourceId: productId,
    });
  }
  res.json({ message: "Deleted" });
});

exports.serverTime = asyncHandler(async (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});
