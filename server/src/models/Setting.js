const mongoose = require("mongoose");
module.exports = mongoose.model("Setting", new mongoose.Schema({
  deliveryCharge: { type: Number, default: 30 },
  expressDeliveryCharge: { type: Number, default: 4 },
  remoteAreaDeliveryCharge: { type: Number, default: 7 },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true }));



