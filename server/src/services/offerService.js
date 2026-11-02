const mongoose = require("mongoose");
const Offer = require("../models/Offer");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function getEffectiveStatus(offer, product, now = new Date()) {
  if (offer.status === "Pending" || offer.status === "Rejected") return offer.status;
  if (offer.status === "Inactive" || !offer.isActive) return "Inactive";
  const startTime = new Date(offer.startDate).getTime();
  const endTime = new Date(offer.endDate).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return "Inactive";
  if (endTime < now.getTime()) return "Expired";
  if (
    !product ||
    product.status !== "Active" ||
    !Number.isFinite(Number(product.price)) ||
    Number(product.price) <= 0 ||
    Number(product.stock) < Number(offer.minimumQuantity || 1) ||
    !["Percentage", "Fixed Amount"].includes(offer.discountType) ||
    !Number.isFinite(Number(offer.discountValue)) ||
    Number(offer.discountValue) <= 0 ||
    (offer.discountType === "Percentage" && Number(offer.discountValue) > 100) ||
    (offer.discountType === "Fixed Amount" && Number(offer.discountValue) >= Number(product.price))
  ) return "Inactive";
  if (startTime > now.getTime()) return "Scheduled";
  return "Active";
}

async function getActiveOffers(productIds, now = new Date()) {
  if (!productIds.length) return [];
  const offers = await Offer.find({
    product: { $in: productIds },
    status: "Active",
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  if (!offers.length) return [];

  const [products, eligibleFarmers, verifiedProfiles] = await Promise.all([
    Product.find({
      _id: { $in: offers.map((offer) => offer.product) },
      status: "Active",
      price: { $gt: 0 },
    }).select("_id farmer status price stock"),
    User.find({
      _id: { $in: offers.map((offer) => offer.farmer) },
      role: "farmer",
      status: "active",
    }).select("_id"),
    FarmerProfile.find({
      user: { $in: offers.map((offer) => offer.farmer) },
      "certification.verifiedByAdmin": true,
      "certification.rejectedByAdmin": { $ne: true },
    }).select("user"),
  ]);
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  const eligibleFarmerIds = new Set(eligibleFarmers.map((farmer) => String(farmer._id)));
  const verifiedFarmerIds = new Set(verifiedProfiles.map((profile) => String(profile.user)));

  return offers.filter((offer) => {
    const product = productsById.get(String(offer.product));
    const quantity = Number(offer.minimumQuantity || 1);
    const value = Number(offer.discountValue);
    return product &&
      String(product.farmer) === String(offer.farmer) &&
      eligibleFarmerIds.has(String(offer.farmer)) &&
      verifiedFarmerIds.has(String(offer.farmer)) &&
      Number.isInteger(quantity) &&
      quantity > 0 &&
      Number(product.stock) >= quantity &&
      Number.isFinite(value) &&
      value > 0 &&
      (offer.discountType === "Percentage"
        ? value <= 100
        : offer.discountType === "Fixed Amount" && value < Number(product.price));
  });
}

function calculateOffer(product, quantity, offers, orderSubtotal = Number(product.price) * Number(quantity)) {
  const productId = String(product._id || product.id);
  const unitPrice = Number(product.price);
  const itemQuantity = Number(quantity);
  const productOffers = offers.filter((offer) =>
    String(offer.product) === productId &&
    String(offer.farmer) === String(product.farmer?._id || product.farmer) &&
    !(offer.discountType === "Fixed Amount" && Number(offer.discountValue) >= unitPrice)
  );

  const candidates = productOffers.map((offer) => {
    if (itemQuantity < Number(offer.minimumQuantity || 1)) return null;
    const gross = unitPrice * itemQuantity;
    if (Number(orderSubtotal) < Number(offer.minimumAmount || 0)) return null;
    const perUnit = offer.discountType === "Percentage"
      ? unitPrice * Number(offer.discountValue) / 100
      : Number(offer.discountValue);
    const uncappedDiscount = perUnit * itemQuantity;
    const cap = offer.maximumDiscount == null ? uncappedDiscount : Number(offer.maximumDiscount);
    const discount = money(Math.min(gross, uncappedDiscount, cap));
    if (discount <= 0) return null;
    return {
      offer,
      discount,
      finalUnitPrice: money((gross - discount) / itemQuantity),
      finalLineTotal: money(gross - discount),
    };
  }).filter(Boolean);

  return candidates.sort((left, right) => right.discount - left.discount)[0] || null;
}

function getDisplayedOffer(product, offers) {
  if (product.status !== "Active" || Number(product.stock) <= 0) return null;
  const productId = String(product._id || product.id);
  const candidates = offers.filter((offer) =>
    String(offer.product) === productId &&
    String(offer.farmer?._id || offer.farmer) === String(product.farmer?._id || product.farmer) &&
    Number(product.stock) >= Number(offer.minimumQuantity || 1) &&
    !(offer.discountType === "Fixed Amount" && Number(offer.discountValue) >= Number(product.price))
  ).map((offer) => {
    const perUnit = offer.discountType === "Percentage"
      ? Number(product.price) * Number(offer.discountValue) / 100
      : Number(offer.discountValue);
    const minimumEligibleQuantity = Number(offer.minimumQuantity || 1);
    const eligibleSubtotal = Number(product.price) * minimumEligibleQuantity;
    const eligibleDiscount = money(Math.min(
      eligibleSubtotal,
      perUnit * minimumEligibleQuantity,
      offer.maximumDiscount == null ? Number.POSITIVE_INFINITY : Number(offer.maximumDiscount)
    ));
    if (eligibleDiscount <= 0) return null;
    const discountAmount = money(eligibleDiscount / minimumEligibleQuantity);
    const minimumEligiblePrice = money((eligibleSubtotal - eligibleDiscount) / minimumEligibleQuantity);
    return {
      _id: offer._id,
      title: offer.title,
      type: offer.type,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      minimumQuantity: offer.minimumQuantity,
      minimumAmount: offer.minimumAmount,
      minimumEligibleQuantity,
      minimumEligiblePrice,
      totalSavings: eligibleDiscount,
      discountAmount,
      discountPercent: Math.round((eligibleDiscount / eligibleSubtotal) * 100),
      appliesToSingleUnit: minimumEligibleQuantity <= 1 && Number(offer.minimumAmount || 0) <= 0,
      startDate: offer.startDate,
      endDate: offer.endDate,
      originalPrice: Number(product.price),
      offerPrice: minimumEligiblePrice,
      maximumDiscount: offer.maximumDiscount,
    };
  }).filter(Boolean);
  return candidates.sort((left, right) => left.offerPrice - right.offerPrice)[0] || null;
}

async function attachProductOffers(products) {
  if (!products.length) return products;
  const ids = products.map((product) => product._id);
  const offers = await getActiveOffers(ids);
  const byProduct = new Map();
  for (const offer of offers) {
    const id = String(offer.product);
    byProduct.set(id, [...(byProduct.get(id) || []), offer]);
  }
  return products.map((product) => {
    const plain = product.toObject ? product.toObject() : { ...product };
    plain.offer = getDisplayedOffer(plain, byProduct.get(String(plain._id)) || []);
    return plain;
  });
}

async function enrichCart(cart) {
  if (!cart) return cart;
  const plain = cart.toObject ? cart.toObject() : { ...cart };
  const offers = await getActiveOffers(plain.items.map((item) => item.product?._id).filter(Boolean));
  const orderSubtotal = plain.items.reduce((sum, item) =>
    sum + Number(item.product?.price || 0) * Number(item.quantity || 0), 0);
  plain.items = plain.items.map((item) => {
    const product = item.product;
    if (!product) return item;
    const applied = calculateOffer(product, item.quantity, offers, orderSubtotal);
    const offer = applied ? {
      _id: applied.offer._id,
      title: applied.offer.title,
      type: applied.offer.type,
      discountType: applied.offer.discountType,
      discountValue: applied.offer.discountValue,
      appliedDiscount: applied.discount,
      finalUnitPrice: applied.finalUnitPrice,
      lineTotal: applied.finalLineTotal,
    } : null;
    return {
      ...item,
      product: { ...product, offer: getDisplayedOffer(product, offers.filter((entry) => String(entry.product) === String(product._id))) },
      offer,
    };
  });
  return plain;
}

async function getSalesByOffer(farmerId) {
  const farmerObjectId = new mongoose.Types.ObjectId(farmerId);
  const rows = await Order.aggregate([
    { $match: { "items.farmer": farmerObjectId } },
    { $unwind: "$items" },
    {
      $addFields: {
        itemStatus: { $ifNull: ["$items.fulfillmentStatus", "$status"] },
      },
    },
    {
      $match: {
        "items.farmer": farmerObjectId,
        "items.offerSnapshot.offerId": { $type: "objectId" },
        itemStatus: "Delivered",
        paymentStatus: { $nin: ["Failed", "Refunded"] },
      },
    },
    {
      $group: {
        _id: "$items.offerSnapshot.offerId",
        unitsSold: { $sum: "$items.quantity" },
        totalSales: {
          $sum: "$items.offerSnapshot.finalLineTotal",
        },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), {
    unitsSold: Number(row.unitsSold || 0),
    totalSales: money(row.totalSales || 0),
  }]));
}

module.exports = {
  money,
  getEffectiveStatus,
  getActiveOffers,
  calculateOffer,
  getDisplayedOffer,
  attachProductOffers,
  enrichCart,
  getSalesByOffer,
};
