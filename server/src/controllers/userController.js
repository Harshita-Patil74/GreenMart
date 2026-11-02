const User = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");const { uploadFile } = require("../services/cloudinaryUpload");
exports.updateMe = asyncHandler(async (req,res) => {
  if (req.body.phone !== undefined && !/^\+91 \d{10}$/.test(req.body.phone)) {
    return res.status(400).json({ message: "Phone number must include +91 followed by exactly 10 digits." });
  }
  const updates = {};
  for (const field of ["name", "phone", "emailNotifications"]) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;
  if (req.file) updates.avatar = await uploadFile(req.file.path, "greenmart/profiles");
  const u = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select("-passwordHash -activationTokenHash -activationTokenExpiry -resetTokenHash -resetTokenExpiry");
  res.json(u);
});
module.exports = exports;
