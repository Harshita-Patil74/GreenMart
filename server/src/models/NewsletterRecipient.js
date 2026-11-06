const mongoose = require("mongoose");

const newsletterRecipientSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "NewsletterCampaign", required: true, index: true },
  subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: "Newsletter" },
  email: { type: String, required: true, lowercase: true, trim: true },
  status: { type: String, enum: ["queued", "sending", "accepted", "delivered", "bounced", "failed", "cancelled"], default: "queued" },
  providerMessageId: { type: String, default: null },
  errorMessage: { type: String, default: null },
  acceptedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  readAt: { type: Date, default: null },
}, { timestamps: true });

newsletterRecipientSchema.index({ campaignId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("NewsletterRecipient", newsletterRecipientSchema);
