const mongoose = require("mongoose");
module.exports = mongoose.model("Message", new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  text: { type: String, required: true },
  isDemo: { type: Boolean, default: false } }, { timestamps: true }));




