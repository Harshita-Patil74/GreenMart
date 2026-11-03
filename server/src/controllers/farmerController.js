const mongoose = require("mongoose");
const FarmerProfile = require("../models/FarmerProfile");
const Product = require("../models/Product");
const User = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");
const { haversine } = require("../utils/haversine");
const { createNotification } = require("../services/notificationService");

exports.list = asyncHandler(async (req,res) => {
  const profiles = await FarmerProfile.find()
    .select("user farmName category description address photo")
    .populate("user", "_id avatar");
  res.json(profiles);
});
exports.get = asyncHandler(async (req,res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Farmer not found" });
  const p = await FarmerProfile.findOne({ user: req.params.id })
    .select("user farmName category description address photo location certification.verifiedByAdmin")
    .populate("user", "_id name avatar");
  if (!p) return res.status(404).json({ message: "Farmer not found" });
  res.json(p);
});
exports.updateLocation = asyncHandler(async (req,res) => {
  const p = await FarmerProfile.findOneAndUpdate({ user: req.user._id }, { location: { lat: req.body.lat, lng: req.body.lng }, address: req.body.address }, { new: true, upsert: true });
  res.json(p);
});
exports.updateMe = asyncHandler(async (req,res) => {
  const allowed = {};
  for (const field of ["farmName", "category", "description", "address", "photo", "certificateName", "certificateNumber"]) {
    if (req.body[field] !== undefined) allowed[field] = req.body[field];
  }
  if (req.file) allowed.photo = `/uploads/farms/${req.file.filename}`;
  const p = await FarmerProfile.findOneAndUpdate({ user: req.user._id }, allowed, { new: true, upsert: true, runValidators: true });
  res.json(p);
});
exports.getProfile = asyncHandler(async (req,res) => {
  const p = await FarmerProfile.findOne({ user: req.user._id }).populate("user","name email avatar");
  if (!p) return res.status(404).json({ message: "Profile not found" });
  res.json(p);
});
exports.updateProfile = asyncHandler(async (req,res) => {
  const allowed = ["fullName","mobile","dateOfBirth","residentialAddress","village","district","state","pinCode","farmName","farmAddress","farmVillage","farmDistrict","farmState","farmPinCode","farmCategory","totalFarmArea","farmDescription","surveyNumber","landOwnershipType","totalLandArea","cultivatedArea","landAreaUnit","landVillage","landTaluk","landDistrict","landState","landPinCode","landDescription","certificateName","certificateNumber"];
  const update = {};
  for (const f of allowed) if (req.body[f] !== undefined) update[f] = req.body[f];
  const p = await FarmerProfile.findOneAndUpdate({ user: req.user._id }, update, { new: true, upsert: true, runValidators: true }).populate("user","name email avatar");
  res.json(p);
});

exports.resubmitApplication = asyncHandler(async (req,res) => {
  const fp = await FarmerProfile.findOne({ user: req.user._id });
  if (!fp) return res.status(404).json({ message: "Profile not found" });
  // Accept optional updated farm details from the request body
  const updatableFields = ["farmName","category","description","address","certificateName","certificateNumber","photo"];
  for (const field of updatableFields) {
    if (req.body[field] !== undefined) fp[field] = req.body[field];
  }
  // Reset certification decision flags so the farmer appears in Pending for admin review
  fp.certification.verifiedByAdmin = false;
  fp.certification.rejectedByAdmin = false;
  fp.certification.rejectionReason = "";
  fp.certification.rejectedAt = undefined;
  fp.verificationStatus = "Pending";
  fp.changeRequestInstructions = "";
  fp.submittedAt = new Date();
  fp.verificationHistory.push({ action: "Resubmitted", timestamp: new Date() });
  await fp.save();
  // notify admins with correct farmer reference
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
  for (const admin of admins) {
    await createNotification({ userId: admin._id, type: "farmerResubmitted", category: "farmers", title: "Farmer resubmitted", message: `Farmer ${fp.farmName || "a farmer"} resubmitted their application for verification.`, resourceType: "FarmerProfile", resourceId: fp._id, actionUrl: `/admin/farmers/${fp.user}`, eventKey: `farmer:resubmitted:${fp.user}:${fp.submittedAt.getTime()}` });
  }
  res.json(fp);
});

exports.uploadCertificate = asyncHandler(async (req,res) => {
  if (!req.file) return res.status(400).json({ message: "No file" });
  const { uploadFile } = require("../services/cloudinaryUpload");
  const url = await uploadFile(req.file.path, "greenmart/certificates");
  const fp = await FarmerProfile.findOneAndUpdate({ user: req.user._id }, { certificateDocument: { url, publicId: "" } }, { new: true, upsert: true });
  res.json(fp);
});

exports.uploadLandDocument = async (req,res) => { if (!req.file) return res.status(400).json({ message: 'No file' }); const p = await FarmerProfile.findOne({ user: req.user._id }); if (!p) return res.status(404).json({ message: 'Profile not found' }); p.landDocument = { originalName: req.file.originalname, filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size, uploadedAt: new Date() }; await p.save(); res.json(p); };
exports.removeLandDocument = async (req,res) => { const p = await FarmerProfile.findOne({ user: req.user._id }); if (!p) return res.status(404).json({ message: 'Profile not found' }); p.landDocument = undefined; await p.save(); res.json(p); };
const path = require("path");
const fs = require("fs");
exports.downloadLandDocument = asyncHandler(async (req,res) => {
  const p = await FarmerProfile.findOne({ user: req.user._id });
  if (!p || !p.landDocument?.filename) return res.status(404).json({ message: "Document not found" });
  const base = path.resolve(__dirname, "..", "..", "private", "uploads", "land");
  const filePath = path.resolve(base, p.landDocument.filename);
  if (!filePath.startsWith(base + path.sep)) return res.status(400).json({ message: "Invalid file" });
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Document not found" });
  res.type(p.landDocument.mimetype || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${p.landDocument.originalName || p.landDocument.filename}"`);
  res.sendFile(filePath);
});
