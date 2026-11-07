const NewsletterSubscription = require("../models/NewsletterSubscription");
const NewsletterPayment = require("../models/NewsletterPayment");
const Newsletter = require("../models/Newsletter");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");
const { asyncHandler } = require("../utils/asyncHandler");

const PLAN = {
  planId: "greenmart-premium",
  planName: "GreenMart Premium",
  amount: 199,
  currency: "INR",
  billingCycle: "monthly",
  durationDays: 30,
  autoRenewal: false,
  paymentMethod: "mock",
};

function generateTransactionId() {
  return `GMP-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * GET /api/newsletter/subscription/plan
 * Public plan config (no auth needed for reading the plan).
 */
exports.getPlan = asyncHandler(async (req, res) => {
  res.json({
    plan: {
      planId: PLAN.planId,
      planName: PLAN.planName,
      amount: PLAN.amount,
      currency: PLAN.currency,
      billingCycle: PLAN.billingCycle,
      durationDays: PLAN.durationDays,
      autoRenewal: PLAN.autoRenewal,
      paymentMethod: PLAN.paymentMethod,
      mock: true,
    },
  });
});

/**
 * GET /api/newsletter/subscription/me
 * Customer's current subscription status.
 */
exports.getMySubscription = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const email = String(req.user.email || "").trim().toLowerCase();
  const subscription = await NewsletterSubscription.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const newsletter = await Newsletter.findOne({ email });
  const now = new Date();

  let status = "not_subscribed";
  let startDate = null;
  let endDate = null;
  let paymentReference = null;

  if (subscription) {
    status = subscription.status;
    startDate = subscription.startDate;
    endDate = subscription.endDate;
    paymentReference = subscription.paymentReference;

    // Auto-expire active subscriptions whose end date has passed.
    if (subscription.status === "active" && subscription.endDate && now > subscription.endDate) {
      subscription.status = "expired";
      await subscription.save();
      status = "expired";

      // Notify admins about subscription expiry.
      try {
        const customer = await User.findById(subscription.user).select("_id name email");
        const admins = await User.find({ role: "admin", status: "active" }).select("_id name email");
        for (const admin of admins) {
          await createNotification({
            userId: admin._id,
            type: "newsletter_subscription_expired",
            category: "subscription_payments",
            title: "Subscription expired",
            message: `Customer ${customer?.name || customer?.email} (${customer?.email}) GreenMart Premium subscription has expired.`,
            resourceType: "NewsletterSubscription",
            resourceId: subscription._id,
            actionUrl: "/admin/notifications?category=subscription_payments",
            icon: "Clock",
            priority: "normal",
            eventKey: `newsletter:subscription-expired:${subscription._id}`,
          });
        }
      } catch (e) { /* ignore */ }
    }
  }

  res.json({
    plan: PLAN,
    subscribed: status === "active",
    status,
    startDate,
    endDate,
    paymentReference,
    amount: subscription ? subscription.amount : null,
    currency: subscription ? subscription.currency : PLAN.currency,
    newsletterActive: !!newsletter?.isActive,
  });
});

/**
 * POST /api/newsletter/subscription/checkout
 * Create a pending mock payment record for subscription purchase.
 */
exports.createCheckout = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const email = String(req.user.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "User email not found" });

  // Server-side amount validation - never trust client-submitted price.
  const amount = PLAN.amount;
  const currency = PLAN.currency;

  // Prevent duplicate pending payments for the same user.
  const existingPending = await NewsletterPayment.findOne({
    user: req.user._id,
    status: "pending",
  });
  if (existingPending) {
    return res.json({
      payment: {
        transactionId: existingPending.transactionId,
        amount: existingPending.amount,
        currency: existingPending.currency,
        status: existingPending.status,
        createdAt: existingPending.createdAt,
        mock: true,
      },
      subscription: null,
      message: "A pending payment already exists. Please confirm or cancel it before creating a new one.",
    });
  }

  const transactionId = generateTransactionId();
  const payment = await NewsletterPayment.create({
    user: req.user._id,
    transactionId,
    amount,
    currency,
    paymentMethod: "mock",
    status: "pending",
    description: `GreenMart Premium Newsletter - ${PLAN.billingCycle} subscription`,
  });

  // Create or update a pending subscription record.
  let subscription = await NewsletterSubscription.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!subscription) {
    subscription = await NewsletterSubscription.create({
      user: req.user._id,
      email,
      planId: PLAN.planId,
      planName: PLAN.planName,
      amount,
      currency,
      billingCycle: PLAN.billingCycle,
      status: "pending",
      startDate: null,
      endDate: null,
      paymentReference: transactionId,
      lastPaymentId: payment._id,
    });
  } else {
    subscription.amount = amount;
    subscription.currency = currency;
    subscription.paymentReference = transactionId;
    subscription.lastPaymentId = payment._id;
    await subscription.save();
  }

  res.status(201).json({
    payment: {
      transactionId: payment.transactionId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
      mock: true,
    },
    subscription: {
      status: subscription.status,
      paymentReference: subscription.paymentReference,
    },
    message: "Mock payment checkout created. Confirm payment to activate your subscription.",
  });
});

/**
 * POST /api/newsletter/subscription/confirm-payment
 * Backend-controlled mock payment confirmation. Only backend decides success/failure.
 */
exports.confirmPayment = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const { transactionId } = req.body || {};
  if (!transactionId) return res.status(400).json({ message: "Transaction ID is required" });

  const payment = await NewsletterPayment.findOne({ transactionId, user: req.user._id });
  if (!payment) return res.status(404).json({ message: "Payment not found" });

  // Idempotent: already processed payments cannot be reused.
  if (payment.status === "successful") {
    return res.status(409).json({ message: "This payment has already been processed." });
  }
  if (payment.status === "cancelled") {
    return res.status(409).json({ message: "This payment was cancelled." });
  }

  // Server-side amount validation - amount must match the plan config exactly.
  if (Number(payment.amount) !== PLAN.amount || payment.currency !== PLAN.currency) {
    return res.status(400).json({ message: "Invalid payment amount." });
  }

  // Simulate mock payment outcome. In this demonstration, payment always succeeds.
  // In a real test scenario, this could be random, but for GreenMart demo we mark it successful.
  payment.status = "successful";
  payment.paidAt = new Date();
  await payment.save();

  const now = new Date();
  const endDate = addDays(now, PLAN.durationDays);

  // Activate subscription (idempotent - start next period after current expiry if renewing).
  let subscription = await NewsletterSubscription.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!subscription) {
    subscription = await NewsletterSubscription.create({
      user: req.user._id,
      email: String(req.user.email || "").trim().toLowerCase(),
      planId: PLAN.planId,
      planName: PLAN.planName,
      amount: PLAN.amount,
      currency: PLAN.currency,
      billingCycle: PLAN.billingCycle,
      status: "active",
      startDate: now,
      endDate,
      paymentReference: transactionId,
      lastPaymentId: payment._id,
    });
  } else {
    // Renewal: start new period after current expiry if already active.
    const currentEnd = subscription.endDate && subscription.endDate > now ? subscription.endDate : now;
    subscription.status = "active";
    subscription.startDate = currentEnd;
    subscription.endDate = addDays(currentEnd, PLAN.durationDays);
    subscription.paymentReference = transactionId;
    subscription.lastPaymentId = payment._id;
    await subscription.save();
  }

  // Ensure the legacy Newsletter record reflects active status for backward compat.
  const email = String(req.user.email || "").trim().toLowerCase();
  if (email) {
    await Newsletter.findOneAndUpdate(
      { email },
      { $setOnInsert: { email, subscriberType: "customer", isActive: true, subscribedAt: new Date() } },
      { upsert: true, new: true },
    );
    const existingNewsletter = await Newsletter.findOne({ email });
    if (existingNewsletter && !existingNewsletter.isActive) {
      existingNewsletter.isActive = true;
      existingNewsletter.subscriberType = "customer";
      existingNewsletter.subscribedAt = new Date();
      existingNewsletter.unsubscribedAt = null;
      await existingNewsletter.save();
    }
  }

  try {
    await createNotification({
      userId: req.user._id,
      type: "newsletter_subscription_activated",
      category: "newsletter",
      title: "Subscription Activated",
      message: `Welcome to GreenMart Premium! Your ${PLAN.billingCycle} subscription (₹${PLAN.amount}) is now active.`,
      resourceType: "NewsletterSubscription",
      resourceId: subscription._id,
      actionUrl: "/customer/dashboard",
      eventKey: `newsletter:subscription-activated:${subscription._id}`,
    });
  } catch (e) { /* ignore */ }

  // Notify all admins about the successful subscription payment.
  try {
    const admins = await User.find({ role: "admin", status: "active" }).select("_id name email");
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: "newsletter_subscription_payment_success",
        category: "subscription_payments",
        title: "Subscription payment successful",
        message: `Customer ${req.user.name || req.user.email} (${req.user.email}) successfully purchased GreenMart Premium for ₹${PLAN.amount}/month using ${payment.paymentMethod}.`,
        resourceType: "NewsletterPayment",
        resourceId: payment._id,
        actionUrl: "/admin/notifications?category=subscription_payments",
        icon: "CreditCard",
        priority: "high",
        eventKey: `newsletter:subscription-payment-success:${payment.transactionId}`,
      });
    }
  } catch (e) { /* ignore */ }

  res.json({
    message: "Subscription activated successfully!",
    payment: {
      transactionId: payment.transactionId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt,
      mock: true,
    },
    subscription: {
      status: subscription.status,
      planName: subscription.planName,
      amount: subscription.amount,
      currency: subscription.currency,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    },
  });
});

/**
 * POST /api/newsletter/subscription/cancel
 * Cancel an active subscription (no refund simulation).
 */
exports.cancelSubscription = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const subscription = await NewsletterSubscription.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!subscription) return res.status(404).json({ message: "Subscription not found" });
  if (subscription.status !== "active") {
    return res.status(400).json({ message: "Only active subscriptions can be cancelled" });
  }

  subscription.status = "cancelled";
  await subscription.save();

  try {
    await createNotification({
      userId: req.user._id,
      type: "newsletter_subscription_cancelled",
      category: "newsletter",
      title: "Subscription Cancelled",
      message: "Your GreenMart Premium subscription has been cancelled.",
      resourceType: "NewsletterSubscription",
      resourceId: subscription._id,
      actionUrl: "/customer/dashboard",
      eventKey: `newsletter:subscription-cancelled:${subscription._id}`,
    });
  } catch (e) { /* ignore */ }

  res.json({ message: "Subscription cancelled.", status: "cancelled" });
});

/**
 * GET /api/newsletter/subscription/payments
 * Customer's payment history.
 */
exports.getMyPayments = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const payments = await NewsletterPayment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({
    payments: payments.map((p) => ({
      transactionId: p.transactionId,
      amount: p.amount,
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      status: p.status,
      description: p.description,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      mock: true,
    })),
  });
});

/**
 * GET /api/newsletter/subscriptions
 * Admin: list all subscriptions.
 */
exports.listSubscriptions = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const { status, search, page: pageParam, limit: limitParam } = req.query || {};
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(limitParam || "20", 10)));
  const query = {};
  if (status && status !== "all") query.status = status;
  if (search) {
    const users = await User.find({
      $or: [
        { name: { $regex: String(search), $options: "i" } },
        { email: { $regex: String(search), $options: "i" } },
      ],
    }).select("_id");
    const userIds = users.map((u) => u._id);
    query.$or = [
      { user: { $in: userIds } },
      { email: { $regex: String(search), $options: "i" } },
    ];
  }

  const total = await NewsletterSubscription.countDocuments(query);
  const items = await NewsletterSubscription.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("user", "name email role")
    .populate("lastPaymentId", "transactionId amount status paidAt");

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * GET /api/newsletter/subscriptions/stats
 * Admin: subscription statistics.
 */
exports.subscriptionStats = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const now = new Date();

  // Get all subscriptions with confirmed payments (active status + valid dates + successful payment)
  const paidSubscriptions = await NewsletterSubscription.find({
    status: "active",
    endDate: { $gte: now },
  }).populate("user", "name email role lastPaymentId");

  const eligibleCustomerIds = new Set();
  paidSubscriptions.forEach((s) => {
    if (s.user && s.user.role === "customer" && s.user.email && s.lastPaymentId) {
      eligibleCustomerIds.add(String(s.user._id));
    }
  });

  const totalPaid = eligibleCustomerIds.size;
  const activePaid = totalPaid;
  const expired = await NewsletterSubscription.countDocuments({ status: "expired" });
  const cancelled = await NewsletterSubscription.countDocuments({ status: "cancelled" });
  const pending = await NewsletterSubscription.countDocuments({ status: "pending" });
  const failed = await NewsletterPayment.countDocuments({ status: "failed" });
  const revenueAgg = await NewsletterPayment.aggregate([
    { $match: { status: "successful" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  // Count eligible recipients: active paid subscription + active newsletter preference + valid email + customer role
  let eligibleRecipients = 0;
  if (eligibleCustomerIds.size > 0) {
    const eligibleUsers = await User.find({
      _id: { $in: Array.from(eligibleCustomerIds) },
      role: "customer",
    }).select("_id email");

    const eligibleUserEmails = new Set(eligibleUsers.map((u) => String(u.email).toLowerCase()).filter(Boolean));

    const activeNewsletters = await Newsletter.find({
      email: { $in: Array.from(eligibleUserEmails) },
      isActive: true,
    }).select("email");

    const activeNewsletterEmails = new Set(activeNewsletters.map((n) => String(n.email).toLowerCase()));

    eligibleRecipients = [...eligibleUserEmails].filter((email) => activeNewsletterEmails.has(email)).length;
  }

  res.json({
    totalSubscriptions: totalPaid,
    activeSubscriptions: activePaid,
    expiredSubscriptions: expired,
    cancelledSubscriptions: cancelled,
    pendingPayments: pending,
    failedPayments: failed,
    simulatedRevenue: revenueAgg[0]?.total || 0,
    eligibleRecipients,
    mode: "mock",
  });
});

/**
 * GET /api/newsletter/payments
 * Admin: list all payments.
 */
exports.listPayments = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const { status, page: pageParam, limit: limitParam } = req.query || {};
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(limitParam || "20", 10)));
  const query = {};
  if (status && status !== "all") query.status = status;

  const total = await NewsletterPayment.countDocuments(query);
  const items = await NewsletterPayment.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("user", "name email")
    .populate("subscription", "planName status endDate");

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

module.exports = exports;
