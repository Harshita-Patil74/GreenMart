const Notification = require("../models/Notification");
const { emitToUser, emitToFarmer, emitToAdmins } = require("../sockets/emitters");
const User = require("../models/User");
const emailService = require("./emailService");

// Stable event-key prefixes used for deduplication. A notification is only
// created when no existing record matches the same recipient + eventKey.
const EVENT_KEY_PREFIXES = {
  orderPlaced: "order:placed",
  orderStatus: "order:status",
  newOrderFarmer: "order:new-farmer",
  newOrderAdmin: "order:new-admin",
  newOfferAdmin: "offer:new-admin",
  offerApproved: "offer:approved",
  offerRejected: "offer:rejected",
  offerDeactivated: "offer:deactivated",
  offerCreatedByAdmin: "offer:created-admin",
  offerUpdatedByAdmin: "offer:updated-admin",
  newProductAdmin: "product:new-admin",
  productDeletedAdmin: "product:deleted-admin",
  stockAlert: "product:stock-alert",
  newReviewAdmin: "review:new-admin",
  newMessage: "message:new",
  newContactAdmin: "contact:new-admin",
  newFarmerAdmin: "farmer:new-admin",
  farmerStatusAdmin: "farmer:status-admin",
  farmerVerifiedAdmin: "farmer:verified-admin",
  farmerRejectedAdmin: "farmer:rejected-admin",
  customerRegisteredAdmin: "customer:registered-admin",
  backInStock: "product:back-in-stock",
  offerResubmitted: "offer:resubmitted",
  passwordChanged: "auth:password-changed",
  farmerCertificationVerified: "farmer:certification-verified",
  farmerCertificationRejected: "farmer:certification-rejected",
  farmerAccountActivated: "farmer:account-activated",
  farmerCertificationSubmitted: "farmer:certification-submitted",
  wishlistOffer: "offer:wishlist",
  subscriptionPaymentSuccess: "subscription:payment-success",
  subscriptionPaymentFailed: "subscription:payment-failed",
  subscriptionExpired: "subscription:expired",
};

async function createNotification({
  userId,
  type,
  category,
  title,
  message,
  orderId,
  resourceType,
  resourceId,
  orderNumber,
  status,
  icon,
  priority = "normal",
  actionUrl,
  eventKey,
}) {
  try {
    // Prevent duplicate notifications for the same event and recipient
    const dedupQuery = { user: userId, type, category };
    if (eventKey) dedupQuery.eventKey = eventKey;
    else if (orderId) dedupQuery.orderId = orderId;
    else if (resourceId) dedupQuery.resourceId = resourceId;

    const existing = await Notification.findOne(dedupQuery);
    if (existing) return existing;

    const n = await Notification.create({
      user: userId,
      type,
      category,
      title,
      message,
      icon,
      priority,
      orderId,
      resourceType,
      resourceId,
      actionUrl,
      eventKey,
    });
    let user;
    try { user = await User.findById(userId); } catch (e) { user = null; }

    // emit to the intended recipient's room only (io may be null in tests)
    if (user) {
      if (user.role === "farmer") emitToFarmer(userId, "notification:new", n);
      else if (user.role === "admin") emitToAdmins("notification:new", n);
      else emitToUser(userId, "notification:new", n);
    }

    // email must never block order creation/status updates
    if (user && user.emailNotifications) {
      try {
        await emailService.sendEmail(type, user.email, {
          ...n.toObject(),
          orderNumber: orderNumber || orderId,
          status: status || "",
        });
      } catch (emailError) {
        console.warn("Notification email was not delivered:", emailError?.code || "EMAIL_ERROR");
      }
    }
    return n;
  } catch (error) {
    // Never let notification failure break business operations
    console.warn("Notification creation failed:", error?.code || error?.message || String(error));
    return null;
  }
}

module.exports = { createNotification, EVENT_KEY_PREFIXES };
