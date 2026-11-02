const mongoose = require("mongoose");
const HarvestSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop" },
  harvestName: { type: String, required: true, trim: true },
  cropName: String,
  cropCategory: String,
  variety: String,
  harvestDate: { type: Date, required: true },
  harvestQuantity: { type: Number, required: true, min: 0 },
  harvestUnit: { type: String, enum: ["kg", "quintal", "tonnes"], required: true },
  qualityGrade: { type: String, enum: ["Premium", "Grade A", "Grade B", "Standard"] },
  storageLocation: String,
  harvestNotes: String,
  availableQuantity: { type: Number, min: 0, default: 0 },
  reservedQuantity: { type: Number, min: 0, default: 0 },
  soldQuantity: { type: Number, min: 0, default: 0 },
  saleStatus: { type: String, enum: ["Not Listed", "Available", "Partially Sold", "Sold Out", "Inactive"], default: "Not Listed" },
  linkedProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
}, { timestamps: true });
module.exports = mongoose.model("Harvest", HarvestSchema);
