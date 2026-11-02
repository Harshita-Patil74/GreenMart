const mongoose = require("mongoose");
const Offer = require("../models/Offer");
const Product = require("../models/Product");
const FarmerProfile = require("../models/FarmerProfile");
const User = require("../models/User");
const Wishlist = require("../models/Wishlist");
const { asyncHandler } = require("../utils/asyncHandler");
const { createNotification, EVENT_KEY_PREFIXES } = require("../services/notificationService");
const {
  money,
  getEffectiveStatus,
  getSalesByOffer,
  combineDateTimeToUTC,
} = require("../services/offerService");

const OFFER_TYPES = ["Seasonal Offer", "Farmer Special", "Limited-Time Deal", "Bundle Offer"];
const DISCOUNT_TYPES = ["Percentage", "Fixed Amount"];
const PRODUCT_FIELDS = "name images price unit stock status farmer";

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function fail(res, status, message) {
  return res.status(status).json({ message });
}

function recordStatusChange(offer, entry) {
  offer.statusHistory.push(entry);
  if (offer.statusHistory.length > 50) offer.statusHistory.splice(0, offer.statusHistory.length - 50);
}

async function getEligibleProduct(productId, farmerId) {
  if (!validId(productId)) return { error: "Select a valid product." };
  const product = await Product.findOne({
    _id: productId,
    farmer: farmerId,
    status: "Active",
    stock: { $gt: 0 },
  });
  if (!product) return { error: "Choose an available product from your own listings." };
  return { product };
}

async function getEligibleFarmer(farmerId) {
  if (!validId(farmerId)) return { error: "Select a valid farmer." };
  const farmer = await User.findOne({ _id: farmerId, role: "farmer", status: "active" }).select("_id name email");
  if (!farmer) return { error: "The selected farmer is not registered or eligible." };
  return { farmer };
}

async function validateOfferData(body, farmerId, existing) {
  body = body && typeof body === "object" ? body : {};
  const productId = body.product ?? existing?.product?._id ?? existing?.product;
  const { product, error } = await getEligibleProduct(productId, farmerId);
  if (error) return { error };
  if (Number(product.price) <= 0) return { error: "Offers require a product with a price greater than zero." };
  const startValue = body.startDate ?? existing?.startDate;
  const endValue = body.endDate ?? existing?.endDate;
  const startTimeValue = body.startTime ?? existing?.startTime;
  const endTimeValue = body.endTime ?? existing?.endTime;
  const startDate = new Date(startValue);
  const endDate = new Date(endValue);
  if (typeof startValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startValue)) startDate.setUTCHours(0, 0, 0, 0);
  if (typeof endValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endValue)) endDate.setUTCHours(23, 59, 59, 999);

  // Combine date and time inputs (Asia/Kolkata) into UTC startAt/endAt
  const startAt = combineDateTimeToUTC(startValue, startTimeValue) || startDate;
  const endAt = combineDateTimeToUTC(endValue, endTimeValue) || endDate;

  const data = {
    title: String(body.title ?? existing?.title ?? "").trim(),
    description: String(body.description ?? existing?.description ?? "").trim(),
    product: product._id,
    type: body.type ?? existing?.type,
    discountType: body.discountType ?? existing?.discountType,
    discountValue: Number(body.discountValue ?? existing?.discountValue),
    startDate,
    endDate,
    startAt,
    endAt,
    minimumQuantity: Number(body.minimumQuantity ?? existing?.minimumQuantity ?? 1),
    minimumAmount: Number(body.minimumAmount ?? existing?.minimumAmount ?? 0),
    maximumDiscount: body.maximumDiscount === "" || body.maximumDiscount === null || Number(body.maximumDiscount ?? existing?.maximumDiscount ?? 0) === 0
      ? null
      : Number(body.maximumDiscount ?? existing?.maximumDiscount ?? null),
    bundleConditions: String(body.bundleConditions ?? existing?.bundleConditions ?? "").trim(),
  };

  if (!data.title || data.title.length > 100) return { error: "Offer title is required and must be 100 characters or fewer." };
  if (!data.description || data.description.length > 1000) return { error: "Offer description is required and must be 1000 characters or fewer." };
  if (!OFFER_TYPES.includes(data.type)) return { error: "Choose a valid offer type." };
  if (!DISCOUNT_TYPES.includes(data.discountType)) return { error: "Choose a valid discount type." };
  if (!Number.isFinite(data.discountValue) || data.discountValue <= 0) return { error: "Discount value must be greater than zero." };
  if (data.discountType === "Percentage" && data.discountValue > 100) return { error: "Percentage discount cannot exceed 100%." };
  if (data.discountType === "Fixed Amount" && data.discountValue >= Number(product.price)) return { error: "Fixed discount must be lower than the product price." };
  if (Number.isNaN(data.startDate.getTime()) || Number.isNaN(data.endDate.getTime()) || data.endDate <= data.startDate) {
    return { error: "Enter valid offer dates; the end date must be after the start date." };
  }
  const startMs = new Date(data.startAt).getTime();
  const endMs = new Date(data.endAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return { error: "Enter valid offer start and end dates/times; the end datetime must be after the start datetime." };
  }
  if (!Number.isInteger(data.minimumQuantity) || data.minimumQuantity < 1 || data.minimumQuantity > Number(product.stock)) {
    return { error: "Minimum quantity must be a whole number within available stock." };
  }
  if (data.type === "Bundle Offer" && data.minimumQuantity < 2) {
    return { error: "Bundle offers require a minimum quantity of at least two." };
  }
  if (!Number.isFinite(data.minimumAmount) || data.minimumAmount < 0) return { error: "Minimum order amount cannot be negative." };
  if (data.maximumDiscount !== null && (!Number.isFinite(data.maximumDiscount) || data.maximumDiscount < 0)) {
    return { error: "Maximum discount cannot be negative." };
  }
  if (data.type === "Bundle Offer" && !data.bundleConditions) {
    return { error: "Describe the selected-product quantity condition for this bundle." };
  }
  if (data.bundleConditions.length > 500) return { error: "Bundle conditions must be 500 characters or fewer." };

  return { data };
}

function serialize(offer, sales = new Map()) {
  const plain = offer.toObject ? offer.toObject() : offer;
  const product = plain.product && typeof plain.product === "object" ? plain.product : null;
  const performance = sales.get(String(plain._id)) || { unitsSold: 0, totalSales: 0 };
  const price = Number(product?.price);
  const quantity = Number(plain.minimumQuantity || 1);
  const discountValue = Number(plain.discountValue);
  const validPrice = Number.isFinite(price) && price > 0;
  const discountPerUnit = plain.discountType === "Percentage"
    ? price * discountValue / 100
    : discountValue;
  const totalDiscount = validPrice && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(discountPerUnit)
    ? money(Math.min(
      price * quantity,
      discountPerUnit * quantity,
      plain.maximumDiscount == null ? Number.POSITIVE_INFINITY : Number(plain.maximumDiscount)
    ))
    : null;
  return {
    ...plain,
    approvalStatus: plain.status,
    effectiveStatus: getEffectiveStatus(plain, product),
    originalPrice: validPrice ? price : null,
    discountAmount: totalDiscount == null ? null : money(totalDiscount / quantity),
    discountPercent: totalDiscount == null ? null : Math.round((totalDiscount / (price * quantity)) * 100),
    offerPrice: totalDiscount == null ? null : money((price * quantity - totalDiscount) / quantity),
    unitsSold: performance.unitsSold,
    totalSales: performance.totalSales,
  };
}

async function getOfferOrNull(id, farmerId) {
  if (!validId(id)) return null;
  return Offer.findOne({ _id: id, farmer: farmerId }).populate("product", PRODUCT_FIELDS);
}

function parsePage(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  return { page, limit };
}

async function getFarmerMetrics(farmerId) {
  const [offers, sales] = await Promise.all([
    Offer.find({ farmer: farmerId }).populate("product", PRODUCT_FIELDS),
    getSalesByOffer(farmerId),
  ]);
  const statuses = offers.map((offer) => getEffectiveStatus(offer, offer.product));
  return {
    sales,
    stats: {
      totalOffers: offers.length,
      activeOffers: statuses.filter((status) => status === "Active").length,
      pendingApproval: statuses.filter((status) => status === "Pending").length,
      totalSales: [...sales.values()].reduce((sum, row) => sum + row.totalSales, 0),
      salesTrackingAvailable: true,
    },
  };
}

exports.farmerList = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req.query);
  const query = { farmer: req.user._id };
  if (OFFER_TYPES.includes(req.query.type)) query.type = req.query.type;
  const search = String(req.query.search || "").trim();
  if (search) {
    const productIds = await Product.find({
      farmer: req.user._id,
      name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    }).distinct("_id");
    query.$or = [
      { title: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      { product: { $in: productIds } },
    ];
  }
  const [offers, metrics] = await Promise.all([
    Offer.find(query).populate("product", PRODUCT_FIELDS).sort({ createdAt: -1 }),
    getFarmerMetrics(req.user._id),
  ]);
  let rows = offers.map((offer) => serialize(offer, metrics.sales));
  if (["Pending", "Active", "Rejected", "Expired", "Inactive", "Scheduled"].includes(req.query.status)) {
    rows = rows.filter((offer) => offer.effectiveStatus === req.query.status);
  }
  const total = rows.length;
  rows = rows.slice((page - 1) * limit, page * limit);
  res.json({ items: rows, total, page, pages: Math.ceil(total / limit), stats: metrics.stats });
});

exports.farmerStats = asyncHandler(async (req, res) => {
  res.json((await getFarmerMetrics(req.user._id)).stats);
});

exports.eligibleProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    farmer: req.user._id,
    status: "Active",
    stock: { $gt: 0 },
    price: { $gt: 0 },
  }).select("name images price unit stock status").sort({ name: 1 });
  res.json(products);
});

exports.farmerGet = asyncHandler(async (req, res) => {
  const offer = await getOfferOrNull(req.params.offerId, req.user._id);
  if (!offer) return fail(res, 404, "Offer not found.");
  const sales = await getSalesByOffer(req.user._id);
  res.json(serialize(offer, sales));
});

exports.farmerCreate = asyncHandler(async (req, res) => {
  const { data, error } = await validateOfferData(req.body, req.user._id);
  if (error) return fail(res, 400, error);
  const offer = await Offer.create({
    ...data,
    farmer: req.user._id,
    status: "Pending",
    isActive: true,
    submittedAt: new Date(),
    statusHistory: [{ status: "Pending", changedBy: req.user._id }],
  });
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } }).select("_id");
  await Promise.all(admins.map((admin) => createNotification({
    userId: admin._id,
    type: "newOfferAdmin",
    category: "offers",
    title: "Offer submitted for review",
    message: `${offer.title} is awaiting administrator approval.`,
    resourceType: "Offer",
    resourceId: offer._id,
  })));
  const populated = await Offer.findById(offer._id).populate("product", PRODUCT_FIELDS);
  res.status(201).json(serialize(populated));
});

exports.farmerUpdate = asyncHandler(async (req, res) => {
  const offer = await getOfferOrNull(req.params.offerId, req.user._id);
  if (!offer) return fail(res, 404, "Offer not found.");
  const { data, error } = await validateOfferData(req.body, req.user._id, offer);
  if (error) return fail(res, 400, error);

  Object.assign(offer, data);
  offer.status = "Pending";
  offer.isActive = offer.isActive !== false;
  offer.approvedAt = undefined;
  offer.approvedBy = undefined;
  offer.rejectedAt = undefined;
  offer.rejectedBy = undefined;
  offer.rejectionReason = "";
  offer.submittedAt = new Date();
  recordStatusChange(offer, {
    status: "Pending",
    reason: "Offer details changed; administrator approval is required again.",
    changedBy: req.user._id,
  });
  await offer.save();

  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } }).select("_id");
  await Promise.all(admins.map((admin) => createNotification({
    userId: admin._id,
    type: "newOfferAdmin",
    category: "offers",
    title: "Offer resubmitted for review",
    message: `${offer.title} was updated and requires approval.`,
    resourceType: "Offer",
    resourceId: offer._id,
  })));
  const updated = await Offer.findById(offer._id).populate("product", PRODUCT_FIELDS);

  // Notify the farmer that their edited offer is awaiting administrator approval
  await createNotification({
    userId: offer.farmer,
    type: "offerResubmitted",
    category: "offers",
    title: "Offer awaiting approval",
    message: `Your edited offer "${offer.title}" is awaiting administrator approval.`,
    resourceType: "Offer",
    resourceId: offer._id,
    icon: "RefreshCw",
    priority: "normal",
    actionUrl: `/farmer/offers/${offer._id}`,
    eventKey: `${EVENT_KEY_PREFIXES.offerResubmitted}:${offer._id}`,
  });

  res.json(serialize(updated));
});

exports.farmerDeactivate = asyncHandler(async (req, res) => {
  const offer = await getOfferOrNull(req.params.offerId, req.user._id);
  if (!offer) return fail(res, 404, "Offer not found.");
  if (!offer.isActive || offer.status === "Inactive") return fail(res, 409, "Offer is already inactive.");
  offer.status = "Inactive";
  offer.isActive = false;
  offer.deactivatedAt = new Date();
  offer.deactivatedBy = req.user._id;
  recordStatusChange(offer, { status: "Inactive", changedBy: req.user._id });
  await offer.save();
  res.json(serialize(await Offer.findById(offer._id).populate("product", PRODUCT_FIELDS)));
});

exports.adminList = asyncHandler(async (req, res) => {
  const { page, limit } = parsePage(req.query);
  const query = {};
  if (validId(req.query.farmerId)) query.farmer = req.query.farmerId;
  if (validId(req.query.productId)) query.product = req.query.productId;
  if (OFFER_TYPES.includes(req.query.type)) query.type = req.query.type;
  const offers = await Offer.find(query)
    .populate("product", PRODUCT_FIELDS)
    .populate("farmer", "name email")
    .sort({ createdAt: -1 });
  let rows = offers.map((offer) => serialize(offer));
  if (req.query.status) rows = rows.filter((offer) => offer.effectiveStatus === req.query.status);
  const search = String(req.query.search || "").trim().toLowerCase();
  if (search) rows = rows.filter((offer) => `${offer.title} ${offer.product?.name || ""} ${offer.farmer?.name || ""}`.toLowerCase().includes(search));
  const total = rows.length;
  rows = rows.slice((page - 1) * limit, page * limit);
  res.json({ items: rows, total, page, pages: Math.ceil(total / limit) });
});

exports.adminOptions = asyncHandler(async (req, res) => {
  const [farmerIds, productIds] = await Promise.all([
    Offer.distinct("farmer"),
    Offer.distinct("product"),
  ]);
  const [farmers, products] = await Promise.all([
    User.find({ _id: { $in: farmerIds }, role: "farmer" }).select("name").sort({ name: 1 }),
    Product.find({ _id: { $in: productIds } })
      .select("name images farmer")
      .populate("farmer", "name")
      .sort({ name: 1 }),
  ]);
  res.json({ farmers, products });
});

exports.adminGet = asyncHandler(async (req, res) => {
  if (!validId(req.params.offerId)) return fail(res, 404, "Offer not found.");
  const offer = await Offer.findById(req.params.offerId)
    .populate("product", PRODUCT_FIELDS)
    .populate("farmer", "name email");
  if (!offer) return fail(res, 404, "Offer not found.");
  res.json(serialize(offer));
});

exports.adminApprove = asyncHandler(async (req, res) => {
  if (!validId(req.params.offerId)) return fail(res, 404, "Offer not found.");
  const offer = await Offer.findById(req.params.offerId);
  if (!offer) return fail(res, 404, "Offer not found.");
  if (offer.status !== "Pending") return fail(res, 409, "Only pending offers can be approved.");
  const [farmer, product, profile] = await Promise.all([
    User.findOne({ _id: offer.farmer, role: "farmer", status: "active" }).select("_id"),
    Product.findOne({
      _id: offer.product,
      farmer: offer.farmer,
      status: "Active",
      stock: { $gte: offer.minimumQuantity },
    }),
    FarmerProfile.findOne({ user: offer.farmer }).select("certification.verifiedByAdmin certification.rejectedByAdmin"),
  ]);
  if (!farmer || !product || !profile?.certification?.verifiedByAdmin || profile.certification.rejectedByAdmin) {
    return fail(res, 409, "The farmer or product is no longer eligible.");
  }

  const price = Number(product.price);
  const quantity = Number(offer.minimumQuantity);
  const discountValue = Number(offer.discountValue);
  const startTime = new Date(offer.startDate).getTime();
  const endTime = new Date(offer.endDate).getTime();
  const maxDiscount = offer.maximumDiscount == null ? Number.POSITIVE_INFINITY : Number(offer.maximumDiscount);
  if (!Number.isFinite(price) || price <= 0 ||
      !Number.isInteger(quantity) || quantity < 1 ||
      !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime || endTime < Date.now() ||
      !OFFER_TYPES.includes(offer.type) ||
      !Number.isFinite(discountValue) || discountValue <= 0 ||
      !Number.isFinite(Number(offer.minimumAmount)) || Number(offer.minimumAmount) < 0 ||
      (offer.maximumDiscount != null && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) ||
      (offer.type === "Bundle Offer" && (!offer.bundleConditions?.trim() || quantity < 2))) {
    return fail(res, 409, "The offer contains invalid or incomplete approval details.");
  }
  if ((offer.discountType === "Percentage" && discountValue > 100) ||
      (offer.discountType === "Fixed Amount" && discountValue >= price) ||
      !DISCOUNT_TYPES.includes(offer.discountType)) {
    return fail(res, 409, "The discount is not valid for the current product price.");
  }
  const discountPerUnit = offer.discountType === "Percentage" ? price * discountValue / 100 : discountValue;
  const totalDiscount = Math.min(price * quantity, discountPerUnit * quantity, maxDiscount);
  const finalTotal = Math.round(((price * quantity - totalDiscount) + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(finalTotal) || finalTotal < 0) {
    return fail(res, 409, "The offer would result in an invalid final price.");
  }

  const approvedAt = new Date();
  const updatedOffer = await Offer.findOneAndUpdate(
    { _id: offer._id, status: "Pending" },
    {
      $set: {
        status: "Active",
        isActive: true,
        approvedAt,
        approvedBy: req.user._id,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: "",
      },
      $push: {
        statusHistory: {
          $each: [{ status: "Active", changedBy: req.user._id, at: approvedAt }],
          $slice: -50,
        },
      },
    },
    { new: true, runValidators: true }
  );
  if (!updatedOffer) return fail(res, 409, "This offer has already been reviewed.");
  await createNotification({
    userId: offer.farmer,
    type: "offerApproved",
    category: "offers",
    title: "Offer approved",
    message: `${offer.title} is approved and will be available during its validity period.`,
    resourceType: "Offer",
    resourceId: offer._id,
  });

  // Notify wishlist customers that their wishlisted product is now on offer
  const productDoc = await Product.findById(offer.product).select("_id name");
  if (productDoc) {
    const wishlists = await Wishlist.find({ products: offer.product }).populate("user", "_id name email");
    for (const wishlist of wishlists) {
      if (wishlist.user) {
        await createNotification({
          userId: wishlist.user._id,
          type: "wishlistOffer",
          category: "offers",
          title: "New special offer",
          message: `${productDoc.name} is now available with a special discount.`,
          resourceType: "Offer",
          resourceId: offer._id,
          icon: "Tag",
          priority: "normal",
          actionUrl: `/product/${offer.product}`,
          eventKey: `${EVENT_KEY_PREFIXES.wishlistOffer}:${offer.product}:${wishlist.user._id}`,
        });
      }
    }
  }
  res.json(serialize(await Offer.findById(updatedOffer._id).populate("product", PRODUCT_FIELDS)));
});

exports.adminReject = asyncHandler(async (req, res) => {
  if (!validId(req.params.offerId)) return fail(res, 404, "Offer not found.");
  const reason = String(req.body?.reason || "").trim();
  if (!reason || reason.length > 500) return fail(res, 400, "A rejection reason of 1–500 characters is required.");
  const offer = await Offer.findById(req.params.offerId);
  if (!offer) return fail(res, 404, "Offer not found.");
  if (offer.status !== "Pending") return fail(res, 409, "Only pending offers can be rejected.");
  const rejectedAt = new Date();
  const updatedOffer = await Offer.findOneAndUpdate(
    { _id: offer._id, status: "Pending" },
    {
      $set: {
        status: "Rejected",
        isActive: false,
        rejectedAt,
        rejectedBy: req.user._id,
        rejectionReason: reason,
      },
      $push: {
        statusHistory: {
          $each: [{ status: "Rejected", reason, changedBy: req.user._id, at: rejectedAt }],
          $slice: -50,
        },
      },
    },
    { new: true, runValidators: true }
  );
  if (!updatedOffer) return fail(res, 409, "This offer has already been reviewed.");
  await createNotification({
    userId: offer.farmer,
    type: "offerRejected",
    category: "offers",
    title: "Offer was not approved",
    message: `${offer.title}: ${reason}`,
    resourceType: "Offer",
    resourceId: offer._id,
  });
  res.json(serialize(await Offer.findById(updatedOffer._id).populate("product", PRODUCT_FIELDS)));
});

exports.adminDeactivate = asyncHandler(async (req, res) => {
  if (!validId(req.params.offerId)) return fail(res, 404, "Offer not found.");
  const offer = await Offer.findById(req.params.offerId);
  if (!offer) return fail(res, 404, "Offer not found.");
  if (!offer.isActive || offer.status !== "Active") return fail(res, 409, "Only active offers can be deactivated.");
  const deactivatedAt = new Date();
  const updatedOffer = await Offer.findOneAndUpdate(
    { _id: offer._id, isActive: true, status: "Active" },
    {
      $set: {
        status: "Inactive",
        isActive: false,
        deactivatedAt,
        deactivatedBy: req.user._id,
      },
      $push: {
        statusHistory: {
          $each: [{ status: "Inactive", changedBy: req.user._id, at: deactivatedAt }],
          $slice: -50,
        },
      },
    },
    { new: true, runValidators: true }
  );
  if (!updatedOffer) return fail(res, 409, "This offer is no longer active.");
  await createNotification({
    userId: offer.farmer,
    type: "offerDeactivated",
    category: "offers",
    title: "Offer deactivated",
    message: `${offer.title} was deactivated by an administrator.`,
    resourceType: "Offer",
    resourceId: offer._id,
  });
  res.json(serialize(await Offer.findById(updatedOffer._id).populate("product", PRODUCT_FIELDS)));
});

exports.adminFarmers = asyncHandler(async (req, res) => {
  const farmers = await User.find({ role: "farmer", status: "active" }).select("name email").sort({ name: 1 });
  res.json(farmers);
});

exports.adminEligibleProducts = asyncHandler(async (req, res) => {
  if (!validId(req.query.farmerId)) return fail(res, 400, "Select a valid farmer.");
  const products = await Product.find({
    farmer: req.query.farmerId,
    status: "Active",
    stock: { $gt: 0 },
    price: { $gt: 0 },
  }).select("name images price unit stock status").sort({ name: 1 });
  res.json(products);
});

exports.adminCreate = asyncHandler(async (req, res) => {
  const { farmer, error: farmerError } = await getEligibleFarmer(req.body?.farmer);
  if (farmerError) return fail(res, 400, farmerError);
  const { data, error } = await validateOfferData(req.body, farmer._id);
  if (error) return fail(res, 400, error);

  const offer = await Offer.create({
    ...data,
    farmer: farmer._id,
    status: "Active",
    isActive: true,
    submittedAt: new Date(),
    approvedAt: new Date(),
    approvedBy: req.user._id,
    createdBy: req.user._id,
    statusHistory: [{ status: "Active", changedBy: req.user._id }],
  });
  await createNotification({
    userId: farmer._id,
    type: "offerCreatedByAdmin",
    category: "offers",
    title: "Admin created an offer for your product",
    message: `An administrator created the offer "${offer.title}" for your product. It is active during its validity period.`,
    resourceType: "Offer",
    resourceId: offer._id,
  });
  const populated = await Offer.findById(offer._id)
    .populate("product", PRODUCT_FIELDS)
    .populate("farmer", "name email");
  res.status(201).json(serialize(populated));
});

exports.adminUpdate = asyncHandler(async (req, res) => {
  if (!validId(req.params.offerId)) return fail(res, 404, "Offer not found.");
  const offer = await Offer.findById(req.params.offerId);
  if (!offer) return fail(res, 404, "Offer not found.");

  const targetFarmerId = req.body?.farmer ? String(req.body.farmer) : String(offer.farmer);
  const { farmer, error: farmerError } = await getEligibleFarmer(targetFarmerId);
  if (farmerError) return fail(res, 400, farmerError);
  const { data, error } = await validateOfferData(req.body, farmer._id, offer);
  if (error) return fail(res, 400, error);

  Object.assign(offer, data);
  offer.farmer = farmer._id;
  offer.status = "Active";
  offer.isActive = true;
  offer.approvedAt = new Date();
  offer.approvedBy = req.user._id;
  offer.rejectedAt = undefined;
  offer.rejectedBy = undefined;
  offer.rejectionReason = "";
  offer.editedBy = req.user._id;
  offer.editedAt = new Date();
  recordStatusChange(offer, {
    status: "Active",
    reason: "Offer updated and approved by an administrator.",
    changedBy: req.user._id,
  });
  await offer.save();

  await createNotification({
    userId: farmer._id,
    type: "offerUpdatedByAdmin",
    category: "offers",
    title: "Admin updated your offer",
    message: `An administrator updated the offer "${offer.title}". Review the changes before they apply at checkout.`,
    resourceType: "Offer",
    resourceId: offer._id,
  });
  const updated = await Offer.findById(offer._id)
    .populate("product", PRODUCT_FIELDS)
    .populate("farmer", "name email");
  res.json(serialize(updated));
});

exports.salesByOffer = getSalesByOffer;
