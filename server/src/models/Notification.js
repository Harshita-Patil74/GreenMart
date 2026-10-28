const mongoose = require("mongoose");
module.exports = mongoose.model("Notification", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: String,
  title: String,
  message: String,
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  isRead: { type: Boolean, default: false },
  isDemo: { type: Boolean, default: false } }, { timestamps: true }));




