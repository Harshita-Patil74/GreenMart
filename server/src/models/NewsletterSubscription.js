const mongoose = require("mongoose");

const newsletterSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  planId: { type: String, required: true, trim: true, default: "greenmart-premium" },
  planName: { type: String, required: true, trim: true, default: "GreenMart Premium" },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, trim: true, default: "INR" },
  billingCycle: { type: String, required: true, trim: true, default: "monthly" },
  status: {
    type: String,
    enum: ["pending", "active", "expired", "cancelled", "payment_failed"],
    default: "pending",
    index: true,
  },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  paymentReference: { type: String, trim: true, default: null },
  lastPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: "NewsletterPayment", default: null },
}, { timestamps: true });

newsletterSubscriptionSchema.index({ user: 1, status: 1 });
newsletterSubscriptionSchema.index({ email: 1 });
newsletterSubscriptionSchema.index({ endDate: 1 });

module.exports = mongoose.model("NewsletterSubscription", newsletterSubscriptionSchema);
