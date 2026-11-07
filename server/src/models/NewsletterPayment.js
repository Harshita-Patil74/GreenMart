const mongoose = require("mongoose");

const newsletterPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: "NewsletterSubscription", index: true },
  transactionId: { type: String, required: true, unique: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, trim: true, default: "INR" },
  paymentMethod: { type: String, required: true, trim: true, default: "mock" },
  status: {
    type: String,
    enum: ["pending", "successful", "failed", "cancelled"],
    default: "pending",
    index: true,
  },
  description: { type: String, trim: true, default: "" },
  paidAt: { type: Date, default: null },
}, { timestamps: true });

newsletterPaymentSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("NewsletterPayment", newsletterPaymentSchema);
