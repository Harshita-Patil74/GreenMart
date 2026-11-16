const mongoose = require("mongoose");
module.exports = mongoose.model("Setting", new mongoose.Schema({
  deliveryCharge: { type: Number, default: 30 },
  expressDeliveryCharge: { type: Number, default: 60 },
  remoteAreaDeliveryCharge: { type: Number, default: 120 },
  standardMaxKm: { type: Number, default: 5 },
  maxRemoteDistanceKm: { type: Number, default: 50 },
  expressMaxKm: { type: Number, default: 10 },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true }));



