const { sendEmail } = require("../services/emailService");
const { asyncHandler } = require("../utils/asyncHandler");
exports.send = asyncHandler(async (req,res) => {
  const env = require("../config/env");
  try {
    await sendEmail("contactForm", env.adminEmail, req.body);
    res.json({ message: "Contact message sent." });
  } catch (error) {
    if (error?.code === "EMAIL_DISABLED") {
      return res.status(503).json({ message: "Email functionality is currently unavailable." });
    }
    throw error;
  }
});
module.exports = exports;
