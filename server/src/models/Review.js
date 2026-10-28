const mongoose = require("mongoose");
const ReviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  isDemo: { type: Boolean, default: false } }, { timestamps: true });
module.exports = mongoose.model("Review", ReviewSchema);




