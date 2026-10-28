const mongoose = require("mongoose");
module.exports = mongoose.model("Wishlist", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  isDemo: { type: Boolean, default: false } }, { timestamps: true }));




