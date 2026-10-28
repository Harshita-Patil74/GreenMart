const mongoose = require("mongoose");
module.exports = mongoose.model("Address", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: String, line1: String, city: String, phone: String,
  coordinates: { lat: Number, lng: Number },
  isDemo: { type: Boolean, default: false } }, { timestamps: true }));




