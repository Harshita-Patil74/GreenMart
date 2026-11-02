const mongoose = require("mongoose");
module.exports = mongoose.model("Notification", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: String,
  category: { type: String, index: true },
  title: String,
  message: String,
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  resourceType: { type: String, index: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, index: true },
  isRead: { type: Boolean, default: false },
  isDemo: { type: Boolean, default: false } }, { timestamps: true }));
