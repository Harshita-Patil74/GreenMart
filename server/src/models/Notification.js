const mongoose = require("mongoose");
module.exports = mongoose.model("Notification", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, index: true },
  category: { type: String, index: true },
  title: String,
  message: String,
  icon: { type: String, index: true },
  priority: { type: String, default: "normal", index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  resourceType: { type: String, index: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, index: true },
  actionUrl: String,
  isRead: { type: Boolean, default: false },
  readAt: Date,
  isDemo: { type: Boolean, default: false },
  eventKey: { type: String, index: true } }, { timestamps: true }));
