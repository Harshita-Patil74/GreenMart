const mongoose = require("mongoose");
const InventoryAdjustmentSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sourceType: { type: String, enum: ["Product", "Harvest"], required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  adjustmentType: { type: String, enum: ["Increase", "Decrease"], required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  previousAvailableQuantity: Number,
  newAvailableQuantity: Number,
  reason: { type: String, required: true },
  notes: String,
  adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
module.exports = mongoose.model("InventoryAdjustment", InventoryAdjustmentSchema);
