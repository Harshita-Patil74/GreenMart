const mongoose = require("mongoose");
const CartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, quantity: Number }],
  isDemo: { type: Boolean, default: false },
  mergeReceipts: [{ operationKey: String, status: { type: String, default: "applied" }, itemsSnapshot: { type: Array, default: [] }, appliedAt: { type: Date, default: Date.now } }],
}, { timestamps: true });
module.exports = mongoose.model("Cart", CartSchema);




