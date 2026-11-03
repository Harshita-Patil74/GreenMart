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
  const query = ["customer", "farmer", "admin"].includes(req.query.role) ? { role: req.query.role } : {};
  res.json(await User.find(query).select("-passwordHash -activationTokenHash -activationTokenExpiry -resetTokenHash -resetTokenExpiry"));
});
exports.farmers = asyncHandler(async (req, res) => {
  const farmers = await FarmerProfile.find()
    .select("user farmName certification createdAt")
    .populate("user", "_id name email accountActivated")
    .sort({ createdAt: -1 });
  res.json(farmers);
});
exports.lowStock = asyncHandler(async (req,res) => res.json(await Product.find({ $expr: { $lte: ["$stock","$lowStockThreshold"] } })));
exports.sales = asyncHandler(async (req,res) => res.json(await statsService.sales()));
exports.categoriesShare = asyncHandler(async (req,res) => res.json(await statsService.categoriesShare()));
exports.reports = asyncHandler(async (req,res) => res.json({ orders: await Order.countDocuments(), products: await Product.countDocuments() }));
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
  await FarmerProfile.create({
    user: user._id,
    farmName: farmName || name+" Farm",
    address: farmAddress,
    category: farmCategory,
    description: about,
    certification: {
      body: certificationName || undefined,
      number: certificateNumber || undefined,
      verifiedByAdmin: false,
    },
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
