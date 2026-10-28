const mongoose = require("mongoose");
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, default: "kg", enum: ["kg","g","L","mL","pcs","dozen","pack"] },
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  images: [String],
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isOrganic: { type: Boolean, default: true },
  harvestDate: Date,
  seasonalAvailability: String,
  ratingAverage: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  status: { type: String, default: "Active" },
  featured: { type: Boolean, default: false },
  isDemo: { type: Boolean, default: false } }, { timestamps: true });
ProductSchema.index({ name: "text", description: "text" });
module.exports = mongoose.model("Product", ProductSchema);




