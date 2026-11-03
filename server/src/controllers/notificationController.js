const Notification = require("../models/Notification");
const { asyncHandler } = require("../utils/asyncHandler");

// Map notification `type` -> standard `category` for legacy records that were
// saved without a category. Keeps type and category distinct: type is the
// event, category is the filter group.
const TYPE_CATEGORY_MAP = {
  orderConfirmation: "orders",
  newOrderFarmer: "orders",
  newOrderAdmin: "orders",
  statusUpdate: "orders",
  orderStatusAdmin: "orders",
  newOfferAdmin: "offers",
  offerApproved: "offers",
  offerRejected: "offers",
  offerResubmitted: "offers",
  offerDeactivated: "offers",
  offerCreatedByAdmin: "offers",
  offerUpdatedByAdmin: "offers",
  newProductAdmin: "products",
  productDeletedAdmin: "products",
  stockAlert: "inventory",
  backInStock: "inventory",
  newReviewAdmin: "products",
  newMessage: "messages",
  newContactAdmin: "support",
  farmerCertificationVerified: "certifications",
  farmerCertificationRejected: "certifications",
  farmerCertificationSubmitted: "certifications",
  farmerAccountActivated: "account",
  passwordChanged: "account",
  accountSecurity: "account",
  systemNotification: "account",
};

exports.list = asyncHandler(async (req, res) => {
  const { user } = req;
  const { category, page, limit } = req.query;
  const query = { user: user._id };
  if (category && category !== "all") {
    const typeCategories = Object.entries(TYPE_CATEGORY_MAP)
      .filter(([, c]) => c === category)
      .map(([t]) => t);
    query.$or = [
      { category },
      { category: { $in: [null, "", undefined] }, type: { $in: typeCategories } },
    ];
  }

  // Backward compatible: when no pagination params are supplied, return a plain array.
  if (!page && !limit) {
    const items = await Notification.find(query).sort({ createdAt: -1 });
    return res.json(items);
  }

  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;
  const [items, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Notification.countDocuments(query),
  ]);
  res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum });
});

exports.unreadCount = asyncHandler(async (req, res) => res.json({ count: await Notification.countDocuments({ user: req.user._id, isRead: false }) }));

exports.markRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { isRead: true, readAt: new Date() });
  if (result.matchedCount === 0) return res.status(404).json({ message: "Notification not found." });
  res.json({ message: "ok" });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ message: "ok" });
});

exports.remove = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ message: "ok" });
});

module.exports = { ...module.exports, TYPE_CATEGORY_MAP };
