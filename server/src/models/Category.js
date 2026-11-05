const mongoose = require("mongoose");
module.exports = mongoose.model("Category", new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  isActive: { type: Boolean, default: true },
  isDemo: { type: Boolean, default: false }
}, { timestamps: true }));
