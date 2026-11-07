const Offer = require("../models/Offer");
const Product = require("../models/Product");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");
const { asyncHandler } = require("../utils/asyncHandler");
const { money, getEffectiveStatus, getEffectiveStart, getEffectiveEnd } = require("../services/offerService");

exports.list = asyncHandler(async (req, res) => {
  const now = new Date();
  const nowMs = now.getTime();
  const { page=1, limit=10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));

  // Find approved offers that are active and not yet expired
  const offers = await Offer.find({
    status: "Active",
    isActive: { $ne: false },
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
    const perUnitDiscount = offer.discountType === "Percentage"
      ? originalPrice * Number(offer.discountValue) / 100
      : Number(offer.discountValue);
    const discount = money(Math.min(
      originalPrice * quantity,
      perUnitDiscount * quantity,
      offer.maximumDiscount == null ? Number.POSITIVE_INFINITY : Number(offer.maximumDiscount)
    ));
    if (!Number.isFinite(originalPrice) || originalPrice <= 0 || !Number.isFinite(discount) || discount <= 0) continue;

    const startTime = getEffectiveStart(offer);
    const endTime = getEffectiveEnd(offer);

    const publicPrice = money((originalPrice * quantity - discount) / quantity);
    let exclusivePrice = null;
    let exclusiveDiscountAmount = null;
    let additionalSavings = null;
    if (offer.exclusiveDiscountType && Number.isFinite(offer.exclusiveDiscountValue) && Number(offer.exclusiveDiscountValue) > 0) {
      const exclusivePerUnit = offer.exclusiveDiscountType === "Percentage"
        ? publicPrice * Number(offer.exclusiveDiscountValue) / 100
        : Number(offer.exclusiveDiscountValue);
      const exclusiveDiscount = money(Math.min(
        publicPrice * quantity,
        exclusivePerUnit * quantity,
        offer.maximumDiscount == null ? Number.POSITIVE_INFINITY : Number(offer.maximumDiscount)
      ));
      if (exclusiveDiscount != null && exclusiveDiscount > 0) {
        exclusivePrice = money(publicPrice - exclusiveDiscount / quantity);
        if (!Number.isFinite(exclusivePrice) || exclusivePrice < 0) exclusivePrice = 0;
        exclusiveDiscountAmount = money(exclusiveDiscount / quantity);
        additionalSavings = money(publicPrice - exclusivePrice);
      }
    }
    const item = {
      _id: offer._id,
      title: offer.title,
      description: offer.description,
      type: offer.type,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      minimumQuantity: offer.minimumQuantity,
      minimumAmount: offer.minimumAmount,
      maximumDiscount: offer.maximumDiscount,
      isSubscriberExclusive: offer.isSubscriberExclusive || false,
      exclusiveDiscountType: offer.exclusiveDiscountType || null,
      exclusiveDiscountValue: offer.exclusiveDiscountValue || null,
      originalPrice,
      publicPrice,
      offerPrice: publicPrice,
      discountAmount: money(discount / quantity),
      discountPercent: Math.round((discount / (originalPrice * quantity)) * 100),
      exclusivePrice,
      exclusiveDiscountAmount,
      additionalSavings,
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
