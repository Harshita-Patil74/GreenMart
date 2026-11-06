const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive: { type: Boolean, default: true },
  subscribedAt: { type: Date, default: Date.now },
  unsubscribedAt: { type: Date, default: null },
  lastEmailSentAt: { type: Date, default: null },
}, { timestamps: true });

newsletterSchema.index({ isActive: 1 });

module.exports = mongoose.model("Newsletter", newsletterSchema);
