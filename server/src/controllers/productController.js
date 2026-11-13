const fs = require('fs');
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const env = require("../config/env");
const Category = require("../models/Category");
const Product = require("../models/Product");
const User = require("../models/User");
const NewsletterSubscription = require("../models/NewsletterSubscription");
const Offer = require("../models/Offer");
const FarmerProfile = require("../models/FarmerProfile");
const Wishlist = require("../models/Wishlist");
const { asyncHandler } = require("../utils/asyncHandler");
const { uploadFileWithPublicId, deleteFile } = require("../services/cloudinaryUpload");
const { createNotification, EVENT_KEY_PREFIXES } = require("../services/notificationService");
const { attachProductOffers, calculateOffer, getEffectiveStatus, roundPercent } = require("../services/offerService");
const { getSearchTerms, createSearchRegex } = require("../utils/search");

const MAX_IMAGES = 6;

function parseRemoveImages(body) {
  if (!body.removeImages) return [];
  try {
    const parsed = JSON.parse(body.removeImages);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function uploadImagesWithTracking(files, folder) {
  const uploaded = [];
  for (const file of files) {
    const result = await uploadFileWithPublicId(file.path, folder);
    uploaded.push({ secure_url: result.secure_url, public_id: result.public_id, localPath: file.path });
  }
  return uploaded;
}

async function cleanupUploads(uploaded) {
  await Promise.all(uploaded.map((u) => deleteFile(u.public_id).catch(() => {})));
}

function extractPublicId(secureUrl) {
  try {
    const url = new URL(secureUrl);
    const path = url.pathname;
    const parts = path.split("/");
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return null;
    let start = uploadIdx + 1;
    if (start < parts.length && /^v\d+$/.test(parts[start])) start++;
    const publicIdParts = parts.slice(start);
    if (!publicIdParts.length) return null;
    const last = publicIdParts[publicIdParts.length - 1];
    publicIdParts[publicIdParts.length - 1] = last.replace(/\.[^/.]+$/, "");
    return publicIdParts.join("/");
  } catch {
    return null;
  }
}

function buildSearchFilter(search) {
  const terms = getSearchTerms(search);
  if (!terms.length) return null;
  const textMatch = {
    $and: terms.map((term) => {
      const regex = createSearchRegex(term);
      return {
        $or: [
          { name: regex },
          { description: regex },
          { category: regex },
        ],
      };
    }),
  };
  const id = String(search).trim();
  if (!mongoose.Types.ObjectId.isValid(id) || String(new mongoose.Types.ObjectId(id)) !== id.toLowerCase()) {
    return textMatch;
  }
  return { $or: [textMatch, { _id: new mongoose.Types.ObjectId(id) }] };
}

async function listProducts(req, res, activeOnly) {
  const { search, category, minPrice, maxPrice, inStock, sort, showDeleted } = req.query;
  const pageNum = Number.isInteger(Number(req.query.page)) && Number(req.query.page) >= 1 ? Number(req.query.page) : 1;
  let limitNum = Number.isInteger(Number(req.query.limit)) && Number(req.query.limit) >= 1 ? Number(req.query.limit) : 10;
  if (limitNum > 100) limitNum = 100;
  const page = pageNum;
  const limit = limitNum;
  const and = [];
  const showDeletedOnly = showDeleted === "true" || showDeleted === true;
  if (activeOnly) {
    and.push({ status: "Active" });
    and.push({ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] });
  } else if (showDeletedOnly) {
    and.push({ isDeleted: true });
  } else {
    and.push({ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] });
  }
  const searchFilter = buildSearchFilter(search);
  if (searchFilter) and.push(searchFilter);
  const normalizedCategory = category ? String(category).trim() : "";
  if (normalizedCategory && normalizedCategory !== "All Products" && normalizedCategory !== "All Categories") {
    and.push({ category: normalizedCategory });
  }
  if (minPrice || maxPrice) {
    const priceFilter = {};
    if (minPrice) priceFilter.$gte = Number(minPrice);
    if (maxPrice) priceFilter.$lte = Number(maxPrice);
    and.push({ price: priceFilter });
  }
  if (inStock === "true") and.push({ stock: { $gt: 0 } });
  else if (inStock === "false") and.push({ stock: { $lte: 0 } });
  if (req.query.farmer) and.push({ farmer: req.query.farmer });
  const q = and.length ? { $and: and } : {};
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
  // Optional authentication: resolve user if a valid Bearer token is present
  let user = null;
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (token) {
      const decoded = jwt.verify(token, env.jwtSecret);
      user = await User.findById(decoded.id).select("-passwordHash -activationTokenHash -activationTokenExpiry -resetTokenHash -resetTokenExpiry");
    }
  } catch (e) {
    // Ignore auth errors – unauthenticated visitors see public offers only
  }

  // Determine if the user has an active Premium subscription
  let isPremium = false;
  if (user && user.role === "customer") {
    const subscription = await NewsletterSubscription.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (subscription && subscription.status === "active") {
      const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
      if (!endDate || now <= endDate) isPremium = true;
    }
  }

  const offers = await Offer.find({
    status: "Active",
    isActive: { $ne: false },
    $or: [
      { startAt: { $lte: now }, endAt: { $gte: now } },
      { startAt: { $gt: now } },
      { startAt: { $exists: false }, startDate: { $lte: now }, endDate: { $gte: now } },
      { startAt: { $exists: false }, startDate: { $gt: now } },
      { endAt: { $exists: false }, startDate: { $lte: now }, endDate: { $gte: now } },
      { endAt: { $exists: false }, startDate: { $gt: now } },
    ],
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
    const eligibleSubtotal = Math.max(originalPrice * quantity, Number(offer.minimumAmount || 0));
    const publicOffer = calculateOffer(product, quantity, [offer], eligibleSubtotal, false);
    const premiumOffer = calculateOffer(product, quantity, [offer], eligibleSubtotal, true);
    if (!Number.isFinite(originalPrice) || originalPrice <= 0) return [];

    const isPremiumOffer = offer.audience?.includes("premium") === true && !offer.audience?.includes("public");
    const isPublicOffer = offer.audience?.includes("public") === true;

    return [{
      ...offer.toObject(),
      product: product.toObject(),
      farmer: offer.farmer,
      effectiveStatus,
      originalPrice,
      publicOfferPrice: publicOffer?.publicFinalUnitPrice ?? null,
      publicDiscountAmount: publicOffer?.discount / quantity ?? 0,
      publicDiscountPercent: publicOffer ? roundPercent((publicOffer.discount / (originalPrice * quantity)) * 100) : 0,
      premiumOfferPrice: premiumOffer?.publicFinalUnitPrice ?? null,
      premiumDiscountAmount: premiumOffer?.premiumDiscount > 0 ? premiumOffer.premiumDiscount / quantity : null,
      premiumDiscountPercent: premiumOffer?.premiumDiscount > 0 && premiumOffer.publicFinalUnitPrice > 0 ? roundPercent((premiumOffer.premiumDiscount / (premiumOffer.publicFinalUnitPrice * quantity)) * 100) : null,
      offerPrice: isPremium && premiumOffer ? premiumOffer.publicFinalUnitPrice : (publicOffer?.publicFinalUnitPrice ?? originalPrice),
      isPremiumEligible: isPremium && !!premiumOffer,
    }];
  });

  res.json({ items });
});
exports.storefrontGet = asyncHandler(async (req,res) => {
  const p = await Product.findOne({ _id: req.params.id, status: "Active" }).populate("farmer","name");
  if (!p) return res.status(404).json({ message: "Not found" });
  res.json((await attachProductOffers([p], { includeSubscriberOffers: true }))[0]);
});
exports.mine = asyncHandler(async (req,res) => {
  const { search, category, page=1, limit=10, showDeleted, status } = req.query;
  const pageNum = Number.isInteger(Number(page)) && Number(page) >= 1 ? Number(page) : 1;
  let limitNum = Number.isInteger(Number(limit)) && Number(limit) >= 1 ? Number(limit) : 10;
  if (limitNum > 50) limitNum = 50;
  const and = [];
  if (showDeleted === "true") {
    and.push({ isDeleted: true });
  } else {
    and.push({ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] });
  }
  const searchFilter = buildSearchFilter(search);
  if (searchFilter) and.push(searchFilter);
  if (category && category !== "All Products" && category !== "All Categories") and.push({ category });
  if (status && status !== "All Status") {
    if (status === "Active") and.push({ status: "Active" });
    else if (status === "Inactive") and.push({ status: "Inactive" });
    else if (status === "Out of stock") and.push({ stock: { $lte: 0 } });
    else if (status === "Low stock") and.push({ $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] } });
  }
  const query = { farmer: req.user._id, ...(and.length ? { $and: and } : {}) };
  const skip = (pageNum - 1) * limitNum;
  const [items, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Product.countDocuments(query),
  ]);
  res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum });
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
  const categoryDoc = await Category.findOne({ name: req.body.category, isActive: true });
  if (!categoryDoc) return res.status(400).json({ message: `Category "${req.body.category}" is not active or does not exist` });
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
    images: [],
  };
  let uploaded = [];
  if (req.files && req.files.length) {
    if (req.files.length > MAX_IMAGES) {
      await Promise.all(req.files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
      return res.status(400).json({ message: `Maximum ${MAX_IMAGES} images allowed per product.` });
    }
    uploaded = await uploadImagesWithTracking(req.files, "greenmart/products");
    data.images = uploaded.map((u) => u.secure_url);
  }
  try {
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
  } catch (createError) {
    await cleanupUploads(uploaded);
    throw createError;
  }
});
exports.update = asyncHandler(async (req,res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  if (req.user.role !== "admin" && String(p.farmer) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  if (req.body.status !== undefined && !["Active", "Inactive"].includes(req.body.status)) {
    return res.status(400).json({ message: "Status must be Active or Inactive" });
  }
  if (req.body.category !== undefined) {
    const categoryDoc = await Category.findOne({ name: req.body.category, isActive: true });
    if (!categoryDoc) return res.status(400).json({ message: `Category "${req.body.category}" is not active or does not exist` });
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
    if (req.files.length > MAX_IMAGES) {
      await Promise.all(req.files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
      return res.status(400).json({ message: `Maximum ${MAX_IMAGES} images allowed per product.` });
    }
  }
  // Compute target images array: start with existing, apply removals, then append new uploads
  let targetImages = Array.isArray(p.images) ? [...p.images] : [];
  const removeUrls = parseRemoveImages(req.body);
  const removedPublicIds = removeUrls.map((url) => extractPublicId(url)).filter(Boolean);
  targetImages = targetImages.filter((img) => !removeUrls.includes(img));
  let newUploads = [];
  if (req.files && req.files.length) {
    newUploads = await uploadImagesWithTracking(req.files, "greenmart/products");
    targetImages = [...targetImages, ...newUploads.map((u) => u.secure_url)];
    if (targetImages.length > MAX_IMAGES) targetImages = targetImages.slice(0, MAX_IMAGES);
  }
  if (targetImages.length) set.images = targetImages;
  // Targeted update: only fields explicitly provided are sent to MongoDB.
  // Legacy products with a null description are never touched, so stock-only
  // updates pass validation without modifying unrelated fields.
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, { $set: set }, { new: true, runValidators: true });
    if (!updated) {
      await cleanupUploads(newUploads);
      await Promise.all(removedPublicIds.map((pid) => deleteFile(pid).catch(() => {})));
      return res.status(404).json({ message: "Not found" });
    }
    // Delete removed images from Cloudinary only after successful DB update
    await Promise.all(removedPublicIds.map((pid) => deleteFile(pid).catch(() => {})));
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
  } catch (updateError) {
    await cleanupUploads(newUploads);
    await Promise.all(removedPublicIds.map((pid) => deleteFile(pid).catch(() => {})));
    throw updateError;
  }
});
exports.remove = asyncHandler(async (req,res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  if (req.user.role !== "admin" && String(p.farmer) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  const productName = p.name;
  const productId = p._id;
  p.isDeleted = true;
  await p.save();
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

exports.restore = asyncHandler(async (req,res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  if (req.user.role !== "admin" && String(p.farmer) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  p.isDeleted = false;
  await p.save();
  res.json({ message: "Restored", product: p });
});

exports.restoreAll = asyncHandler(async (req,res) => {
  const farmerId = req.user.role === "admin" ? (req.query.farmer || req.user._id) : req.user._id;
  const result = await Product.updateMany({ farmer: farmerId, isDeleted: true }, { $set: { isDeleted: false } });
  res.json({ message: "All deleted products restored", restoredCount: result.modifiedCount });
});

exports.serverTime = asyncHandler(async (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});
