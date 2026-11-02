const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  type: {
    type: String,
    required: true,
    enum: ["Seasonal Offer", "Farmer Special", "Limited-Time Deal", "Bundle Offer"],
  },
  discountType: { type: String, required: true, enum: ["Percentage", "Fixed Amount"] },
  discountValue: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  minimumQuantity: { type: Number, default: 1, min: 1 },
  minimumAmount: { type: Number, default: 0, min: 0 },
  maximumDiscount: { type: Number, default: null, min: 0 },
  bundleConditions: { type: String, default: "", trim: true, maxlength: 500 },
  status: {
    type: String,
    enum: ["Pending", "Active", "Rejected", "Inactive"],
    default: "Pending",
    index: true,
  },
  isActive: { type: Boolean, default: true },
  submittedAt: { type: Date, default: Date.now },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rejectedAt: Date,
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rejectionReason: { type: String, default: "", maxlength: 500 },
  deactivatedAt: Date,
  deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  editedAt: Date,
  statusHistory: [{
    status: String,
    reason: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

OfferSchema.index({ farmer: 1, createdAt: -1 });
OfferSchema.index({ product: 1, status: 1, isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("Offer", OfferSchema);
