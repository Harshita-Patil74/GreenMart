const mongoose = require("mongoose");
const CropSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  cropName: { type: String, required: true, trim: true },
  cropCategory: { type: String, required: true, trim: true },
  cropVariety: String,
  cropDescription: String,
  growingSeason: { type: String, enum: ["Kharif", "Rabi", "Zaid", "Year-round"] },
  cultivatedArea: { type: Number, min: 0 },
  areaUnit: { type: String, enum: ["Acres", "Hectares"] },
  sowingDate: Date,
  expectedHarvestDate: Date,
  actualHarvestDate: Date,
  expectedYield: { type: Number, min: 0 },
  yieldUnit: { type: String, enum: ["kg", "quintal", "tonnes"] },
  availableQuantity: { type: Number, min: 0 },
  organicFarmingMethod: String,
  farmingNotes: String,
  status: { type: String, enum: ["Planned", "Growing", "Ready for Harvest", "Harvested", "Inactive"], default: "Planned" },
}, { timestamps: true });
module.exports = mongoose.model("Crop", CropSchema);
