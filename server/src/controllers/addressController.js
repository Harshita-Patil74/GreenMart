const Address = require("../models/Address");
const { asyncHandler } = require("../utils/asyncHandler");
const { clearDeliveryCache } = require("../services/deliveryService");

function normalizePhone(phone) {
  return String(phone || "").trim().replace(/\s+/g, " ");
}

function validateAddress(body) {
  const name = String(body.name || "").trim();
  const line1 = String(body.line1 || "").trim();
  const city = String(body.city || "").trim();
  const phone = normalizePhone(body.phone);
  const errors = [];
  if (!name) errors.push("Recipient name is required.");
  if (!line1) errors.push("Street address is required.");
  if (!city) errors.push("City is required.");
  if (!phone) errors.push("Phone number is required.");
  else if (!/^\+?[\d\s-]{7,}$/.test(phone)) errors.push("Please enter a valid phone number.");
  if (errors.length) {
    const error = new Error(errors.join(" "));
    error.status = 400;
    throw error;
  }

  let coordinates = null;
  if (body.coordinates && typeof body.coordinates === "object") {
    const lat = Number(body.coordinates.lat);
    const lng = Number(body.coordinates.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push("Latitude must be between -90 and 90.");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.push("Longitude must be between -180 and 180.");
    }
    if (errors.length === 0 && Number.isFinite(lat) && Number.isFinite(lng)) {
      coordinates = { lat, lng };
    }
  }

  if (errors.length) {
    const error = new Error(errors.join(" "));
    error.status = 400;
    throw error;
  }
  return { name, line1, city, phone, coordinates };
}

async function unsetOtherDefaults(userId, exceptId) {
  const query = { user: userId, isDefault: true };
  if (exceptId) query._id = { $ne: exceptId };
  await Address.updateMany(query, { $set: { isDefault: false } });
}

exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;
  const query = { user: req.user._id };
  const [items, total] = await Promise.all([
    Address.find(query).sort({ isDefault: -1, createdAt: -1 }).skip(skip).limit(limitNum),
    Address.countDocuments(query),
  ]);
  res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, line1, city, phone, coordinates } = validateAddress(req.body);
  const existingCount = await Address.countDocuments({ user: req.user._id });
  const isDefault = Boolean(req.body.isDefault) || existingCount === 0;
  if (isDefault) await unsetOtherDefaults(req.user._id, null);
  const address = await Address.create({
    user: req.user._id,
    name,
    line1,
    city,
    phone,
    coordinates,
    isDefault,
  });
  clearDeliveryCache();
  res.status(201).json(address);
});

exports.update = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found." });
  const validated = validateAddress({ ...address.toObject(), ...req.body });
  address.name = validated.name;
  address.line1 = validated.line1;
  address.city = validated.city;
  address.phone = validated.phone;
  if (validated.coordinates != null) address.coordinates = validated.coordinates;
  if (req.body.isDefault === true) {
    await unsetOtherDefaults(req.user._id, address._id);
    address.isDefault = true;
  }
  await address.save();
  clearDeliveryCache();
  res.json(address);
});

exports.remove = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found." });
  const wasDefault = address.isDefault;
  await Address.deleteOne({ _id: address._id, user: req.user._id });
  if (wasDefault) {
    const next = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
  res.json({ message: "Address deleted." });
});

exports.setDefault = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found." });
  await unsetOtherDefaults(req.user._id, address._id);
  address.isDefault = true;
  await address.save();
  clearDeliveryCache();
  res.json(address);
});

module.exports = exports;