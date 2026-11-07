const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const FarmerProfile = require("../models/FarmerProfile");
const statsService = require("../services/statsService");
const { buildReportPdf, REPORT_TYPES } = require("../services/reportPdfService");
const { asyncHandler } = require("../utils/asyncHandler");
const { createNotification, EVENT_KEY_PREFIXES } = require("../services/notificationService");
const { randomToken, hashToken } = require("../utils/tokens");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../services/emailService");
const { getSmtpStatus } = require("../config/mailer");
const env = require("../config/env");
const AdminAuditLog = require("../models/AdminAuditLog");

async function recordAdminAction(actorId, action, targetUserId) {
  await AdminAuditLog.create({ actor: actorId, action, targetUser: targetUserId });
}

function farmerActivationLink(email, token) {
  return `${env.clientUrl}/activate-account?email=${encodeURIComponent(email)}#token=${token}`;
}

async function issueFarmerActivation(user) {
  const token = randomToken();
  user.activationTokenHash = await hashToken(token);
  user.activationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const link = farmerActivationLink(user.email, token);

  const smtpStatus = getSmtpStatus();
  if (env.emailEnabled && smtpStatus.configured) {
    try {
      await sendEmail("farmerActivation", user.email, link);
    } catch (emailError) {
      console.warn("Failed to send activation email:", emailError?.message);
    }
  }

  // Always return the link so admins can copy and share it manually when email is not configured.
  return link;
}

exports.stats = asyncHandler(async (req,res) => res.json(await statsService.adminStats(req.query.from, req.query.to)));
exports.users = asyncHandler(async (req,res) => {
  const { page=1, limit=10, role, search } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const query = {};
  if (role && ["customer", "farmer", "admin"].includes(role)) query.role = role;
  if (search && search.trim()) {
    const s2 = search.trim().toLowerCase();
    const regex = new RegExp(s2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { name: regex },
      { email: regex },
    ];
  }
  const [users, total] = await Promise.all([
    User.find(query).select("-passwordHash -activationTokenHash -activationTokenExpiry -resetTokenHash -resetTokenExpiry").sort({ createdAt: -1 }).skip((pageNum-1)*limitNum).limit(limitNum),
    User.countDocuments(query),
  ]);
  res.json({ items: users, total, page: pageNum, pages: Math.ceil(total/limitNum), limit: limitNum });
});
exports.farmers = asyncHandler(async (req, res) => {
  const { page=1, limit=10, search } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const query = {};
  if (search && search.trim()) {
    const s2 = search.trim().toLowerCase();
    const regex = new RegExp(s2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { farmName: regex },
      { category: regex },
      { "user.name": regex },
      { "user.email": regex },
    ];
  }
  const [farmers, total] = await Promise.all([
    FarmerProfile.find(query).select("user farmName certification verificationStatus changeRequestInstructions verificationHistory submittedAt description address category photo certificateDocument certificateName certificateNumber createdAt").populate("user", "_id name email phone accountActivated").sort({ createdAt: -1 }).skip((pageNum-1)*limitNum).limit(limitNum),
    FarmerProfile.countDocuments(query),
  ]);
  res.json({ items: farmers, total, page: pageNum, pages: Math.ceil(total/limitNum), limit: limitNum });
});
exports.lowStock = asyncHandler(async (req,res) => res.json(await Product.find({ $expr: { $lte: ["$stock","$lowStockThreshold"] } })));
exports.sales = asyncHandler(async (req,res) => res.json(await statsService.sales()));
exports.categoriesShare = asyncHandler(async (req,res) => res.json(await statsService.categoriesShare()));
exports.reports = asyncHandler(async (req,res) => res.json({ orders: await Order.countDocuments(), products: await Product.countDocuments() }));

function parseDateFilter(from, to) {
  const filter = {};
  const validate = (value, name) => {
    if (!value) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const error = new Error(`Invalid ${name} date.`);
      error.status = 400;
      throw error;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      const error = new Error(`Invalid ${name} date.`);
      error.status = 400;
      throw error;
    }
  };
  validate(from, "from");
  validate(to, "to");
  if (from && to && from > to) {
    const error = new Error("Start date must be before end date.");
    error.status = 400;
    throw error;
  }
  if (from) filter.createdAt = { ...filter.createdAt, $gte: new Date(`${from}T00:00:00.000Z`) };
  if (to) filter.createdAt = { ...filter.createdAt, $lte: new Date(`${to}T23:59:59.999Z`) };
  return filter;
}
exports.analytics = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = parseDateFilter(from, to);
  match.status = { $nin: ["Cancelled", "Delivery Failed"] };
  match.paymentStatus = { $ne: "Failed" };
  const orders = await Order.find(match).populate("items.product", "category name images").lean();
  let totalSales = 0;
  const orderIds = new Set();
  const salesByCategory = {};
  const topSellingProducts = {};
  const byDate = {};
  orders.forEach((o) => {
    orderIds.add(String(o._id));
    let orderTotal = 0;
    (o.items || []).forEach((item) => {
      const amount = Number(item.offerSnapshot?.finalLineTotal ?? (item.price || 0) * (item.quantity || 0));
      orderTotal += amount;
      const product = item.product && typeof item.product === "object" ? item.product : null;
      const category = (product && product.category) || "Other";
      salesByCategory[category] = (salesByCategory[category] || 0) + amount;
      const name = item.name || (product && product.name) || "Product";
      if (!topSellingProducts[name]) {
        topSellingProducts[name] = { name, quantity: 0, revenue: 0, image: item.image || (product && product.images && product.images[0]) || "" };
      }
      topSellingProducts[name].quantity += Number(item.quantity || 0);
      topSellingProducts[name].revenue += amount;
    });
    totalSales += orderTotal;
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    byDate[key] = (byDate[key] || 0) + orderTotal;
  });
  const totalOrders = orderIds.size;
  const averageOrderValue = totalOrders ? totalSales / totalOrders : 0;
  const salesOverview = { totalSales, totalOrders, averageOrderValue, from, to };
  const salesByCategoryArr = Object.entries(salesByCategory)
    .map(([category, revenue]) => ({ category, revenue: Number(revenue.toFixed(2)) }))
    .sort((a, b) => b.revenue - a.revenue);
  const topSellingProductsArr = Object.values(topSellingProducts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  const trendLabels = [];
  const trendValues = [];
  if (from && to && from <= to) {
    const cursor = new Date(`${from}T00:00:00.000Z`);
    const last = new Date(`${to}T00:00:00.000Z`);
    while (cursor <= last) {
      const key = cursor.toISOString().slice(0, 10);
      trendLabels.push(key);
      trendValues.push(Number((byDate[key] || 0).toFixed(2)));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  const salesTrend = { labels: trendLabels, values: trendValues };
  res.json({
    totalSales: Number(totalSales.toFixed(2)),
    totalOrders,
    averageOrderValue: Number(averageOrderValue.toFixed(2)),
    salesOverview,
    salesByCategory: salesByCategoryArr,
    topSellingProducts: topSellingProductsArr,
    salesTrend,
  });
});
exports.reportPdf = asyncHandler(async (req, res) => {
  const { type, from = "", to = "", category = "" } = req.query;
  if (!REPORT_TYPES.includes(type)) return res.status(400).json({ message: "Invalid report type." });
  const pdf = await buildReportPdf({ type, from, to, category });
  const filename = `greenmart-${type.toLowerCase().replaceAll(" ", "-")}.pdf`;
  res.status(200)
    .set("Content-Type", "application/pdf")
    .set("Content-Disposition", `attachment; filename="${filename}"`)
    .send(pdf);
});
exports.updateUser = asyncHandler(async (req,res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  const isSelf = String(req.params.id) === String(req.user._id);
  if (isSelf && (req.body.status === "blocked" || (req.body.role && req.body.role !== target.role))) {
    return res.status(403).json({ message: "Cannot change your own account status or role" });
  }

  if (req.body.role !== undefined && !["customer", "farmer", "admin"].includes(req.body.role)) {
    return res.status(400).json({ message: "Invalid user role" });
  }
  if (req.body.status !== undefined && !["active", "blocked"].includes(req.body.status)) {
    return res.status(400).json({ message: "Status must be active or blocked" });
  }
  const demotingAdmin = target.role === "admin" && req.body.role && req.body.role !== "admin";
  const blockingAdmin = target.role === "admin" && req.body.status === "blocked";
  if (demotingAdmin || blockingAdmin) {
    const adminCount = await User.countDocuments({ role: "admin", status: { $ne: "blocked" } });
    if (adminCount <= 1) return res.status(409).json({ message: "Cannot remove the last active administrator" });
  }
  const allowed = ["name","email","phone","status","role"];
  const update = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select("-passwordHash -activationTokenHash -activationTokenExpiry -resetTokenHash -resetTokenExpiry");
  if (target.role === "farmer" && (req.body.status !== undefined || req.body.role !== undefined)) {
    await recordAdminAction(req.user._id, "farmer.account.updated", target._id);
  }
  // Notify all admins when a farmer account status changes
  if (req.body.status !== undefined && target.role === "farmer") {
    const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: "farmerStatusAdmin",
        category: "farmers",
        title: "Farmer account status changed",
        message: `A farmer account status has been updated to ${updated.status}.`,
        resourceType: "User",
        resourceId: target._id,
      });
    }
    // Notify the farmer when their account is activated
    if (updated.status === "active") {
      await createNotification({
        userId: target._id,
        type: "farmerAccountActivated",
        category: "account",
        title: "Farmer account approved",
        message: "Your farmer account has been approved by Admin. You can now add products.",
        icon: "UserCheck",
        priority: "high",
        actionUrl: "/farmer/dashboard",
        eventKey: `${EVENT_KEY_PREFIXES.farmerAccountActivated}:${target._id}`,
      });
    }
  }
  res.json(updated);
});
exports.verifyFarmer = asyncHandler(async (req,res) => {
  const fp = await FarmerProfile.findOneAndUpdate({ user: req.params.id }, { "certification.verifiedByAdmin": true, "certification.verifiedAt": new Date(), "certification.rejectedByAdmin": false, "certification.rejectionReason": "", verificationStatus: "Verified", $push: { verificationHistory: { action: "Verified", admin: req.user._id, timestamp: new Date() } } }, { new: true });
  if (!fp) return res.status(404).json({ message: "Farmer profile not found" });
  await recordAdminAction(req.user._id, "farmer.certification.verified", fp.user);
  // Notify all admins about farmer verification
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin._id,
      type: "farmerVerifiedAdmin",
      category: "farmers",
      title: "Farmer account verified",
      message: `A farmer account has been verified and approved.`,
      resourceType: "User",
      resourceId: req.params.id,
    });
  }
  // Notify the farmer that their certification is verified
  await createNotification({
    userId: fp.user,
    type: "farmerCertificationVerified",
    category: "certifications",
    title: "Certification verified",
    message: "Your Organic Farming Certificate has been verified.",
    icon: "ShieldCheck",
    priority: "high",
    actionUrl: "/farmer/profile",
    eventKey: `${EVENT_KEY_PREFIXES.farmerCertificationVerified}:${fp.user}`,
  });
  res.json(fp);
});
exports.rejectFarmer = asyncHandler(async (req,res) => {
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0,500) : "";
  const fp = await FarmerProfile.findOneAndUpdate({ user: req.params.id }, { "certification.verifiedByAdmin": false, "certification.rejectedByAdmin": true, "certification.rejectedAt": new Date(), "certification.rejectionReason": reason, verificationStatus: "Rejected", $push: { verificationHistory: { action: "Rejected", admin: req.user._id, timestamp: new Date(), reason } } }, { new: true });
  if (!fp) return res.status(404).json({ message: "Farmer profile not found" });
  await recordAdminAction(req.user._id, "farmer.certification.rejected", fp.user);
  // Notify all admins about farmer rejection
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin._id,
      type: "farmerRejectedAdmin",
      category: "farmers",
      title: "Farmer account rejected",
      message: `A farmer account has been rejected.`,
      resourceType: "User",
      resourceId: req.params.id,
    });
  }
  // Notify the farmer that their certification is rejected
  await createNotification({
    userId: fp.user,
    type: "farmerCertificationRejected",
    category: "certifications",
    title: "Certification rejected",
    message: `Your certification was rejected: ${reason || "Please review the rejection reason."}`,
    icon: "FileX",
    priority: "high",
    actionUrl: "/farmer/profile",
    eventKey: `${EVENT_KEY_PREFIXES.farmerCertificationRejected}:${fp.user}`,
  });
  res.json(fp);
});
exports.createFarmer = asyncHandler(async (req,res) => {
  const { name, email, phone, farmName, farmAddress, farmCategory, about, certificationName, certificateNumber } = req.body;
  const normalizedEmail = email.toLowerCase();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) return res.status(400).json({ message: "Email is already registered." });
  const passwordHash = await bcrypt.hash(randomToken(), 10);
  let user;
  try {
    user = await User.create({ name, email: normalizedEmail, passwordHash, role: "farmer", phone, accountActivated: false });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Email is already registered." });
    }
    throw error;
  }
  const { uploadFile } = require("../services/cloudinaryUpload");
  let certificateDocument, farmPhotoUrl;
  if (req.files?.certificate?.[0]) {
    const url = await uploadFile(req.files.certificate[0].path, "greenmart/certificates");
    certificateDocument = { url, publicId: "" };
  }
  if (req.files?.farmPhoto?.[0]) {
    farmPhotoUrl = await uploadFile(req.files.farmPhoto[0].path, "greenmart/farms");
  }
  await FarmerProfile.create({
    user: user._id,
    farmName: farmName || name+" Farm",
    address: farmAddress,
    category: farmCategory,
    description: about,
    photo: farmPhotoUrl,
    certificateName: certificationName || undefined,
    certificateNumber: certificateNumber || undefined,
    certificateDocument,
    certification: {
      body: certificationName || undefined,
      number: certificateNumber || undefined,
      verifiedByAdmin: false,
    },
    submittedAt: new Date(),
  });
  await recordAdminAction(req.user._id, "farmer.account.created", user._id);
  const activationLink = await issueFarmerActivation(user);
  const emailSent = env.emailEnabled && getSmtpStatus().configured;
  // Notify all admins about the new farmer registration
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin._id,
      type: "newFarmerAdmin",
      category: "farmers",
      title: "New farmer registered",
      message: `A new farmer has registered on GreenMart.`,
      resourceType: "User",
      resourceId: user._id,
    });
  }
  // Notify admins when certification is submitted for verification
  if (certificationName || certificateNumber) {
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: "farmerCertificationSubmitted",
        category: "certifications",
        title: "Certification submitted",
        message: `Farmer ${name} submitted ${certificationName || "a certificate"} for verification.`,
        resourceType: "User",
        resourceId: user._id,
        icon: "FileText",
        priority: "normal",
        actionUrl: `/admin/farmers/${user._id}`,
        eventKey: `${EVENT_KEY_PREFIXES.farmerCertificationSubmitted}:${user._id}`,
      });
    }
  }
  res.status(201).json({
    message: emailSent
      ? "Farmer created. Activation email sent."
      : "Farmer created, but activation email could not be sent. Check email settings and use Resend activation.",
    activationLink,
    activationEmailSent: emailSent,
  });
});

exports.requestFarmerChanges = asyncHandler(async (req,res) => {
  const instructions = typeof req.body?.instructions === "string" ? req.body.instructions.trim().slice(0,1000) : "";
  if (!instructions) return res.status(400).json({ message: "Correction instructions are required." });
  const fp = await FarmerProfile.findOneAndUpdate({ user: req.params.id }, { verificationStatus: "Changes Requested", changeRequestInstructions: instructions, $push: { verificationHistory: { action: "Changes Requested", admin: req.user._id, timestamp: new Date(), reason: instructions } } }, { new: true });
  if (!fp) return res.status(404).json({ message: "Farmer profile not found" });
  await createNotification({ userId: fp.user, type: "farmerChangesRequested", category: "certifications", title: "Changes requested", message: instructions, eventKey: `farmer:changes:${fp.user}:${Date.now()}` });
  res.json(fp);
});

exports.resendFarmerActivation = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: "farmer" });
  if (!user) return res.status(404).json({ message: "Farmer account not found." });
  if (user.accountActivated !== false) return res.status(409).json({ message: "This farmer account is already activated." });
  await recordAdminAction(req.user._id, "farmer.activation.resent", user._id);
  const activationLink = await issueFarmerActivation(user);
  const emailSent = env.emailEnabled && getSmtpStatus().configured;
  res.json({
    message: emailSent
      ? "Activation link sent to the farmer."
      : "Activation link regenerated. Email could not be sent. Use the link below to activate the farmer's account.",
    activationLink,
    activationEmailSent: emailSent,
  });
});
exports.getLandReview = async (req, res) => {
  const FarmerProfile = require("../models/FarmerProfile");
  const fp = await FarmerProfile.findOne({ user: req.params.farmerId }).populate("user", "name email");
  if (!fp) return res.status(404).json({ message: "Profile not found" });
  res.json(fp);
};
exports.updateLandReview = async (req, res) => {
  const FarmerProfile = require("../models/FarmerProfile");
  const { status, remarks } = req.body;
  if (!["Pending Review", "Approved", "Rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });
  const fp = await FarmerProfile.findOneAndUpdate({ user: req.params.farmerId }, { landVerificationStatus: status, landReviewRemarks: remarks || "", landReviewedBy: req.user._id, landReviewedAt: new Date() }, { new: true });
  if (!fp) return res.status(404).json({ message: "Profile not found" });
  res.json(fp);
};
module.exports = exports;
