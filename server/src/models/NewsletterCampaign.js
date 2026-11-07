const mongoose = require("mongoose");

const newsletterCampaignSchema = new mongoose.Schema({
  campaignName: { type: String, required: true, trim: true },
  campaignType: { type: String, enum: ["offers", "new-products", "fresh-harvest", "farmer-spotlight", "announcements", "custom"], default: "custom" },
  subject: { type: String, required: true, trim: true },
  preheader: { type: String, trim: true, default: "" },
  heading: { type: String, trim: true, default: "" },
  content: { type: String, default: "" },
  bannerImage: { type: String, trim: true, default: "" },
  bannerImageFileId: { type: String, trim: true, default: "" },
  buttonText: { type: String, trim: true, default: "" },
  buttonUrl: { type: String, trim: true, default: "" },
  selectedProducts: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],
  selectedOffers: [{
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer" },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],
  farmerSpotlight: { type: mongoose.Schema.Types.Mixed, default: null },
  audienceType: { type: String, enum: ["all", "selected"], default: "all" },
  selectedSubscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Newsletter" }],
  status: { type: String, enum: ["draft", "sending", "sent", "cancelled", "failed"], default: "draft" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  scheduledAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  recipientCount: { type: Number, default: 0 },
  acceptedCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  bouncedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("NewsletterCampaign", newsletterCampaignSchema);
