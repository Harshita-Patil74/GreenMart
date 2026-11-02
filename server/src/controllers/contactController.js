const { sendEmail } = require("../services/emailService");
const { asyncHandler } = require("../utils/asyncHandler");
const { createNotification } = require("../services/notificationService");
const User = require("../models/User");
exports.send = asyncHandler(async (req,res) => {
  const env = require("../config/env");
  try {
    await sendEmail("contactForm", env.adminEmail, req.body);
    // Notify all admins about the new contact message
    const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: "newContactAdmin",
        category: "support",
        title: "New customer message",
        message: `A customer has submitted a new support request.`,
        resourceType: "Contact",
      });
    }
    res.json({ message: "Contact message sent." });
  } catch (error) {
    if (error?.code === "EMAIL_DISABLED") {
      return res.status(503).json({ message: "Email functionality is currently unavailable." });
    }
    throw error;
  }
});
module.exports = exports;
