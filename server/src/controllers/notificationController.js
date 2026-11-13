const Notification = require("../models/Notification");
const Order = require("../models/Order");
const { asyncHandler } = require("../utils/asyncHandler");

async function includeFarmerOrderNumbers(items, user) {
  if (user.role !== "farmer") return items;
  const orderIds = [...new Set(items.map((item) => item.orderId && String(item.orderId)).filter(Boolean))];
  if (!orderIds.length) return items;

  const orders = await Order.find({
    _id: { $in: orderIds },
    "items.farmer": user._id,
  }).select("orderNumber").lean();
  const orderNumbers = new Map(orders.map((order) => [String(order._id), order.orderNumber]));
  return items.map((item) => {
    const notification = item.toObject ? item.toObject() : item;
    const orderNumber = orderNumbers.get(String(item.orderId));
    return orderNumber ? { ...notification, orderNumber } : notification;
  });
}

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
  productCreatedByAdmin: "products",
  productUpdatedByAdmin: "products",
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
  wishlistAdded: "wishlist",
  wishlistRemoved: "wishlist",
  profileUpdated: "account",
  supportRequestSubmitted: "support",
  paymentSuccess: "payments",
  newsletter_campaign: "newsletter",
  newsletter_unsubscribed_admin: "newsletter",
  newsletter_subscription_payment_success: "subscription_payments",
  newsletter_subscription_payment_failed: "subscription_payments",
  newsletter_subscription_expired: "subscription_payments",
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
    return res.json(await includeFarmerOrderNumbers(items, user));
  }

  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;
  const [items, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Notification.countDocuments(query),
  ]);
  res.json({ items: await includeFarmerOrderNumbers(items, user), total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum });
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
