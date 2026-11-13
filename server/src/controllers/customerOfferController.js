const Offer = require("../models/Offer");
const Product = require("../models/Product");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");
const NewsletterSubscription = require("../models/NewsletterSubscription");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { asyncHandler } = require("../utils/asyncHandler");
const { money, roundPercent, calculateOffer, getEffectiveStatus, getEffectiveStart, getEffectiveEnd } = require("../services/offerService");

exports.list = asyncHandler(async (req, res) => {
  const now = new Date();
  const nowMs = now.getTime();
  const { page=1, limit=10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));

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

  // Determine if the customer has an active paid Premium subscription
  let isPremium = false;
  if (user && user.role === "customer") {
    const subscription = await NewsletterSubscription.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (subscription && subscription.status === "active") {
      const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
      if (!endDate || now <= endDate) isPremium = true;
    }
  }

  // Find approved offers that are active and not yet expired, including upcoming offers
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

  const activeItems = [];
  const upcomingItems = [];

  for (const offer of offers) {
    const product = offer.product;
    const farmerId = String(offer.farmer?._id || offer.farmer || "");
    if (!product || product.status !== "Active" ||
        String(product.farmer?._id || product.farmer || "") !== farmerId ||
        !activeFarmerIds.has(farmerId) ||
        !verifiedFarmerIds.has(farmerId) ||
        Number(product.stock) < Number(offer.minimumQuantity || 1)) continue;

    const effectiveStatus = getEffectiveStatus(offer, product, now);
    if (effectiveStatus !== "Active" && effectiveStatus !== "Scheduled") continue;

    const quantity = Math.max(1, Number(offer.minimumQuantity || 1));
    const originalPrice = Number(product.price);
    const eligibleSubtotal = Math.max(originalPrice * quantity, Number(offer.minimumAmount || 0));
    const appliedOffer = calculateOffer(product, quantity, [offer], eligibleSubtotal, isPremium);
    const premiumOffer = calculateOffer(product, quantity, [offer], eligibleSubtotal, true);
    if (!Number.isFinite(originalPrice) || originalPrice <= 0 || !appliedOffer) continue;

    const startTime = getEffectiveStart(offer);
    const endTime = getEffectiveEnd(offer);

    const discount = appliedOffer?.publicDiscount || 0;
    const publicPrice = appliedOffer?.publicFinalUnitPrice ?? originalPrice;
    const isPremiumExclusive = offer.audience?.includes("premium") === true && !offer.audience?.includes("public");
    const isPublicOffer = offer.audience?.includes("public") === true;
    const item = {
      _id: offer._id,
      title: isPremiumExclusive ? "Premium Exclusive" : offer.title,
      description: isPremiumExclusive ? "" : offer.description,
      type: offer.type,
      discountType: !isPublicOffer ? null : offer.discountType,
      discountValue: !isPublicOffer ? null : offer.discountValue,
      minimumQuantity: offer.minimumQuantity,
      minimumAmount: offer.minimumAmount,
      maximumDiscount: !isPublicOffer ? null : offer.maximumDiscount,
      isPremiumExclusive,
      premiumExclusiveTeaser: isPremiumExclusive,
      regularDiscountType: isPublicOffer ? offer.discountType : null,
      regularDiscountValue: isPublicOffer ? offer.discountValue : null,
      regularDiscountAmount: isPublicOffer ? money(appliedOffer.publicDiscount / quantity) : null,
      regularDiscountPercent: isPublicOffer
        ? roundPercent((appliedOffer.publicDiscount / (originalPrice * quantity)) * 100)
        : null,
      premiumDiscountAmount: premiumOffer?.premiumDiscount > 0
        ? money(premiumOffer.premiumDiscount / quantity)
        : null,
      premiumDiscountPercent: premiumOffer?.premiumDiscount > 0 && premiumOffer.publicFinalUnitPrice > 0
        ? roundPercent((premiumOffer.premiumDiscount / (premiumOffer.publicFinalUnitPrice * quantity)) * 100)
        : null,
      originalPrice,
      publicPrice: !isPublicOffer ? null : publicPrice,
      offerPrice: isPremiumExclusive ? originalPrice : publicPrice,
      discountAmount: !isPublicOffer ? 0 : money(discount / quantity),
      discountPercent: !isPublicOffer ? 0 : roundPercent((discount / (originalPrice * quantity)) * 100),
      effectiveStatus,
      startDate: offer.startDate,
      endDate: offer.endDate,
      startAt: offer.startAt,
      endAt: offer.endAt,
      product: {
        _id: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        unit: product.unit,
        stock: product.stock,
        images: product.images,
        isOrganic: product.isOrganic,
      },
      farmer: {
        _id: farmerId,
        name: product.farmer?.name || offer.farmer?.name || "GreenMart Farmer",
      },
    };

    if (effectiveStatus === "Scheduled") {
      upcomingItems.push(item);
    } else {
      activeItems.push(item);
    }
  }

  const activeTotal = activeItems.length;
  const upcomingTotal = upcomingItems.length;
  const activeSkip = (pageNum - 1) * limitNum;
  const upcomingSkip = (pageNum - 1) * limitNum;
  const activePaged = activeItems.slice(activeSkip, activeSkip + limitNum);
  const upcomingPaged = upcomingItems.slice(upcomingSkip, upcomingSkip + limitNum);

  res.json({
    active: activePaged,
    upcoming: upcomingPaged,
    serverTime: now.toISOString(),
    pagination: {
      page: pageNum,
      limit: limitNum,
      activeTotal,
      upcomingTotal,
      activePages: Math.ceil(activeTotal / limitNum),
      upcomingPages: Math.ceil(upcomingTotal / limitNum),
    },
  });
});
