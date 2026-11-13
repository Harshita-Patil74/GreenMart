const mongoose = require("mongoose");
const Offer = require("../models/Offer");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");

const money = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : 0;
};

const roundPercent = (value) => {
  const percent = Number(value);
  return Number.isFinite(percent)
    ? Math.round(percent + Number.EPSILON * Math.max(1, Math.abs(percent)))
    : 0;
};

// Combine a date string (YYYY-MM-DD) and time string (HH:MM) interpreted in Asia/Kolkata into a UTC Date.
// Returns null if either value is missing or invalid.
function combineDateTimeToUTC(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const datePart = String(dateValue).trim();
  const timePart = String(timeValue).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || !/^\d{2}:\d{2}$/.test(timePart)) return null;
  // Asia/Kolkata is UTC+5:30; construct ISO string in local time then let Date parse it as UTC,
  // then subtract 5h30m to get true UTC.
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  // Build "YYYY-MM-DDTHH:MM:SS" treated as Kolkata local time
  const localIso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:00`;
  const localMs = Date.parse(localIso);
  if (!Number.isFinite(localMs)) return null;
  // Subtract 5h30m (19800000 ms) to convert Kolkata local time to UTC
  return new Date(localMs - 5 * 60 * 60 * 1000 - 30 * 60 * 1000);
}

function getEffectiveStart(offer) {
  if (offer.startAt) return new Date(offer.startAt).getTime();
  if (offer.startDate) return new Date(offer.startDate).getTime();
  return null;
}

function getEffectiveEnd(offer) {
  if (offer.endAt) return new Date(offer.endAt).getTime();
  if (offer.endDate) return new Date(offer.endDate).getTime();
  return null;
}

function getEffectiveStatus(offer, product, now = new Date()) {
  const nowMs = now.getTime();
  if (offer.status === "Pending" || offer.status === "Rejected") return offer.status;
  if (offer.status === "Inactive" || offer.isActive === false) return "Inactive";
  const startTime = getEffectiveStart(offer);
  const endTime = getEffectiveEnd(offer);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return "Inactive";
  if (endTime < nowMs) return "Expired";
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
  if (startTime > nowMs) return "Scheduled";
  return "Active";
}

async function getActiveOffers(productIds, now = new Date()) {
  if (!productIds.length) return [];
  const nowMs = now.getTime();
  const offers = await Offer.find({
    product: { $in: productIds },
    status: "Active",
    isActive: { $ne: false },
    $or: [
      { startAt: { $lte: now }, endAt: { $gte: now } },
      { startAt: { $exists: false }, startDate: { $lte: now }, endDate: { $gte: now } },
      { endAt: { $exists: false }, startDate: { $lte: now }, endDate: { $gte: now } },
    ],
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
    const startTime = getEffectiveStart(offer);
    const endTime = getEffectiveEnd(offer);
    const quantity = Number(offer.minimumQuantity || 1);
    const value = Number(offer.discountValue);
    return product &&
      String(product.farmer) === String(offer.farmer) &&
      eligibleFarmerIds.has(String(offer.farmer)) &&
      verifiedFarmerIds.has(String(offer.farmer)) &&
      Number.isFinite(startTime) && startTime <= nowMs &&
      Number.isFinite(endTime) && endTime > nowMs &&
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

function calculateOffer(product, quantity, offers, orderSubtotal = Number(product.price) * Number(quantity), isPremium = false) {
  const productId = String(product._id || product.id);
  const unitPrice = money(product.price);
  const itemQuantity = Number(quantity);
  const productOffers = offers.filter((offer) => {
    const audience = offer.audience || (offer.isSubscriberExclusive === true ? ["premium"] : ["public"]);
    return String(offer.product?._id || offer.product) === productId &&
      String(offer.farmer?._id || offer.farmer) === String(product.farmer?._id || product.farmer) &&
      (isPremium || audience.includes("public")) &&
      !(offer.discountType === "Fixed Amount" && Number(offer.discountValue) >= unitPrice)
  });

  const candidates = productOffers.map((offer) => {
    if (itemQuantity < Number(offer.minimumQuantity || 1)) return null;
    const gross = money(unitPrice * itemQuantity);
    if (Number(orderSubtotal) < Number(offer.minimumAmount || 0)) return null;
    let publicDiscount = 0;
    if (offer.discountType && Number.isFinite(Number(offer.discountValue)) && Number(offer.discountValue) > 0) {
      const requestedPerUnitDiscount = offer.discountType === "Percentage"
        ? unitPrice * Number(offer.discountValue) / 100
        : Number(offer.discountValue);
      const uncappedDiscount = money(money(requestedPerUnitDiscount) * itemQuantity);
      const publicDiscountCap = offer.maximumDiscount == null ? uncappedDiscount : Number(offer.maximumDiscount);
      publicDiscount = money(Math.min(gross, uncappedDiscount, publicDiscountCap));
    }
    const publicFinalTotal = money(gross - publicDiscount);
    const publicFinalUnitPrice = money(publicFinalTotal / itemQuantity);
    let premiumDiscount = 0;
    if (isPremium && offer.exclusiveDiscountType && Number.isFinite(Number(offer.exclusiveDiscountValue)) && Number(offer.exclusiveDiscountValue) > 0) {
      const exclusivePerUnit = offer.exclusiveDiscountType === "Percentage"
        ? money(publicFinalUnitPrice * Number(offer.exclusiveDiscountValue) / 100)
        : money(Number(offer.exclusiveDiscountValue));
      const exclusiveUncapped = money(exclusivePerUnit * itemQuantity);
      const exclusiveCap = offer.maximumDiscount == null ? exclusiveUncapped : Number(offer.maximumDiscount);
      premiumDiscount = money(Math.min(publicFinalTotal, exclusiveUncapped, exclusiveCap));
    }
    const finalTotal = money(publicFinalTotal - premiumDiscount);
    const finalUnitPrice = money(finalTotal / itemQuantity);
    if (!Number.isFinite(finalTotal) || finalTotal < 0) return null;
    const totalDiscount = money(gross - finalTotal);
    return {
      offer,
      discount: totalDiscount,
      publicDiscount,
      premiumDiscount,
      publicFinalUnitPrice,
      finalUnitPrice,
      finalLineTotal: finalTotal,
    };
  }).filter(Boolean);

  return candidates.sort((left, right) => right.discount - left.discount)[0] || null;
}

function getDisplayedOffer(product, offers) {
  if (product.status !== "Active" || Number(product.stock) <= 0) return null;
  const productId = String(product._id || product.id);
  const candidates = offers.filter((offer) => {
    const audience = offer.audience || (offer.isSubscriberExclusive === true ? ["premium"] : ["public"]);
    return String(offer.product) === productId &&
      String(offer.farmer?._id || offer.farmer) === String(product.farmer?._id || product.farmer) &&
      audience.includes("public") &&
      Number(product.stock) >= Number(offer.minimumQuantity || 1) &&
      !(offer.discountType === "Fixed Amount" && Number(offer.discountValue) >= Number(product.price))
  }).map((offer) => {
    const minimumEligibleQuantity = Number(offer.minimumQuantity || 1);
    const eligibleSubtotal = money(Number(product.price) * minimumEligibleQuantity);
    const minimumOrderSubtotal = Math.max(eligibleSubtotal, Number(offer.minimumAmount || 0));
    const appliedOffer = calculateOffer(product, minimumEligibleQuantity, [offer], minimumOrderSubtotal);
    const premiumOffer = calculateOffer(product, minimumEligibleQuantity, [offer], minimumOrderSubtotal, true);
    if (!appliedOffer) return null;
    const eligibleDiscount = appliedOffer.discount;
    const discountAmount = money(Number(product.price) - appliedOffer.finalUnitPrice);
    const minimumEligiblePrice = appliedOffer.finalUnitPrice;
    const premiumDiscountAmount = premiumOffer?.premiumDiscount > 0
      ? money(premiumOffer.premiumDiscount / minimumEligibleQuantity)
      : null;
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
      discountPercent: roundPercent((eligibleDiscount / eligibleSubtotal) * 100),
      premiumDiscountAmount,
      premiumDiscountPercent: premiumDiscountAmount != null && premiumOffer.publicFinalUnitPrice > 0
        ? roundPercent((premiumOffer.premiumDiscount / (premiumOffer.publicFinalUnitPrice * minimumEligibleQuantity)) * 100)
        : null,
      appliesToSingleUnit: minimumEligibleQuantity <= 1 && Number(offer.minimumAmount || 0) <= 0,
      startDate: offer.startDate,
      endDate: offer.endDate,
      startAt: offer.startAt,
      endAt: offer.endAt,
      originalPrice: Number(product.price),
      offerPrice: minimumEligiblePrice,
      maximumDiscount: offer.maximumDiscount,
    };
  }).filter(Boolean);
  return candidates.sort((left, right) => left.offerPrice - right.offerPrice)[0] || null;
}

function getDisplayedSubscriberOffer(product, offers) {
  if (product.status !== "Active" || Number(product.stock) <= 0) return null;
  const productId = String(product._id || product.id);
  const candidates = offers.filter((offer) => {
    const audience = offer.audience || (offer.isSubscriberExclusive === true ? ["premium"] : ["public"]);
    return String(offer.product?._id || offer.product) === productId &&
      String(offer.farmer?._id || offer.farmer) === String(product.farmer?._id || product.farmer) &&
      audience.includes("premium") &&
      Number(product.stock) >= Number(offer.minimumQuantity || 1) &&
      !(offer.discountType === "Fixed Amount" && Number(offer.discountValue) >= Number(product.price))
  }).map((offer) => {
    const minimumEligibleQuantity = Number(offer.minimumQuantity || 1);
    const eligibleSubtotal = money(Number(product.price) * minimumEligibleQuantity);
    const minimumOrderSubtotal = Math.max(eligibleSubtotal, Number(offer.minimumAmount || 0));
    const appliedOffer = calculateOffer(product, minimumEligibleQuantity, [offer], minimumOrderSubtotal, true);
    if (!appliedOffer) return null;
    const premiumDiscountPercent = appliedOffer.premiumDiscount > 0 && appliedOffer.publicDiscount < eligibleSubtotal
      ? roundPercent((appliedOffer.premiumDiscount / (eligibleSubtotal - appliedOffer.publicDiscount)) * 100)
      : 0;
    return {
      _id: offer._id,
      title: offer.title,
      type: offer.type,
      minimumQuantity: offer.minimumQuantity,
      minimumAmount: offer.minimumAmount,
      minimumEligibleQuantity,
      totalSavings: appliedOffer.discount,
      regularDiscountAmount: money(appliedOffer.publicDiscount / minimumEligibleQuantity),
      regularDiscountPercent: roundPercent((appliedOffer.publicDiscount / eligibleSubtotal) * 100),
      premiumDiscountAmount: money(appliedOffer.premiumDiscount / minimumEligibleQuantity),
      premiumDiscountPercent,
      startDate: offer.startDate,
      endDate: offer.endDate,
      startAt: offer.startAt,
      endAt: offer.endAt,
      originalPrice: Number(product.price),
      maximumDiscount: offer.maximumDiscount,
    };
  }).filter(Boolean);
  return candidates.sort((left, right) => right.totalSavings - left.totalSavings)[0] || null;
}

async function attachProductOffers(products, { includeSubscriberOffers = false } = {}) {
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
    const productOffers = byProduct.get(String(plain._id)) || [];
    plain.offer = getDisplayedOffer(plain, productOffers);
    if (includeSubscriberOffers) {
      plain.subscriberOffer = getDisplayedSubscriberOffer(plain, productOffers);
    }
    return plain;
  });
}

async function enrichCart(cart, isPremium = false) {
  if (!cart) return cart;
  const plain = cart.toObject ? cart.toObject() : { ...cart };
  const offers = await getActiveOffers(plain.items.map((item) => item.product?._id).filter(Boolean));
  const orderSubtotal = plain.items.reduce((sum, item) =>
    sum + Number(item.product?.price || 0) * Number(item.quantity || 0), 0);
  plain.items = plain.items.map((item) => {
    const product = item.product;
    if (!product) return item;
    const applied = calculateOffer(product, item.quantity, offers, orderSubtotal, isPremium);
    const offer = applied ? {
      _id: applied.offer._id,
      title: applied.offer.title,
      type: applied.offer.type,
      discountType: applied.offer.discountType,
      discountValue: applied.offer.discountValue,
      isSubscriberExclusive: applied.offer.audience?.includes("premium") === true,
      appliedDiscount: applied.discount,
      premiumDiscount: applied.premiumDiscount,
      finalUnitPrice: applied.finalUnitPrice,
      lineTotal: applied.finalLineTotal,
    } : null;
    return {
      ...item,
      product: {
        ...product,
        offer: getDisplayedOffer(product, offers.filter((entry) => String(entry.product) === String(product._id))),
        subscriberOffer: getDisplayedSubscriberOffer(product, offers.filter((entry) => String(entry.product) === String(product._id))),
      },
      offer,
    };
  });
  return plain;
}

function lineGross(item) {
  const price = Number(item?.product?.price ?? item?.price ?? 0);
  const quantity = Number(item?.quantity);
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) return 0;
  return money(price * quantity);
}

function lineDiscount(item) {
  const applied = Number(item?.offer?.appliedDiscount ?? item?.offerSnapshot?.appliedDiscount ?? 0);
  if (!Number.isFinite(applied) || applied <= 0) return 0;
  return money(Math.min(applied, lineGross(item)));
}

function linePremiumDiscount(item) {
  const isPremiumExclusive = item?.offer?.audience?.includes("premium") === true ||
    item?.offerSnapshot?.audience?.includes("premium") === true;
  if (isPremiumExclusive) return lineDiscount(item);
  const premium = Number(item?.offer?.premiumDiscount ?? item?.offerSnapshot?.premiumDiscount ?? 0);
  if (!Number.isFinite(premium) || premium <= 0) return 0;
  return money(Math.min(premium, lineDiscount(item)));
}

function computeCartTotals(items = [], deliveryCharge = 0) {
  const list = Array.isArray(items) ? items : [];
  const subtotal = money(list.reduce((sum, item) => sum + lineGross(item), 0));
  const discount = money(Math.min(subtotal, list.reduce((sum, item) => sum + lineDiscount(item), 0)));
  const premiumDiscount = money(Math.min(discount, list.reduce((sum, item) => sum + linePremiumDiscount(item), 0)));
  const regularDiscount = money(discount - premiumDiscount);
  const hasItems = subtotal > 0;
  const charge = Number(deliveryCharge);
  const delivery = hasItems && Number.isFinite(charge) && charge >= 0 ? money(charge) : 0;
  const total = money(Math.max(0, subtotal - discount + delivery));
  return { subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge: delivery, total };
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
  roundPercent,
  getEffectiveStatus,
  getActiveOffers,
  calculateOffer,
  getDisplayedOffer,
  getDisplayedSubscriberOffer,
  attachProductOffers,
  enrichCart,
  computeCartTotals,
  getSalesByOffer,
  combineDateTimeToUTC,
  getEffectiveStart,
  getEffectiveEnd,
};
