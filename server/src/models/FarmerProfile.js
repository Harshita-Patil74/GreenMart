const mongoose = require("mongoose");
const FarmerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  farmName: { type: String, required: true },
  category: String,
  description: String,
  address: String,
  location: { lat: Number, lng: Number },
  photo: String,
  certification: { body: String, number: String, verifiedByAdmin: { type: Boolean, default: false }, verifiedAt: Date, rejectedByAdmin: { type: Boolean, default: false }, rejectedAt: Date, rejectionReason: String },
  isDemo: { type: Boolean, default: false } }, { timestamps: true });
module.exports = mongoose.model("FarmerProfile", FarmerProfileSchema);




