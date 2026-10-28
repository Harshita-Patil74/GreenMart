const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const FarmerProfile = require("../models/FarmerProfile");
const statsService = require("../services/statsService");
const { buildReportPdf, REPORT_TYPES } = require("../services/reportPdfService");
const { asyncHandler } = require("../utils/asyncHandler");

exports.stats = asyncHandler(async (req,res) => res.json(await statsService.adminStats(req.query.from, req.query.to)));
exports.users = asyncHandler(async (req,res) => res.json(await User.find().select("-passwordHash")));
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
  res.json(await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select("-passwordHash"));
});
exports.verifyFarmer = asyncHandler(async (req,res) => {
  const fp = await FarmerProfile.findOneAndUpdate({ user: req.params.id }, { "certification.verifiedByAdmin": true, "certification.verifiedAt": new Date(), "certification.rejectedByAdmin": false, "certification.rejectionReason": "" }, { new: true });
  if (!fp) return res.status(404).json({ message: "Farmer profile not found" });
  res.json(fp);
});
exports.rejectFarmer = asyncHandler(async (req,res) => {
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0,500) : "";
  const fp = await FarmerProfile.findOneAndUpdate({ user: req.params.id }, { "certification.verifiedByAdmin": false, "certification.rejectedByAdmin": true, "certification.rejectedAt": new Date(), "certification.rejectionReason": reason }, { new: true });
  if (!fp) return res.status(404).json({ message: "Farmer profile not found" });
  res.json(fp);
});
module.exports = exports;
