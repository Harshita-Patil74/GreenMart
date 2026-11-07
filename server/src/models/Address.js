const mongoose = require("mongoose");
module.exports = mongoose.model("Address", new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  coordinates: { lat: Number, lng: Number },
  isDefault: { type: Boolean, default: false },
  isDemo: { type: Boolean, default: false }
}, { timestamps: true }));




