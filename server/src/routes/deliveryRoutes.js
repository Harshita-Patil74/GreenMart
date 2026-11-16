const express = require("express");
const router = express.Router();
const {
  calculateDistanceKm,
  deliveryOptionsForDistance,
} = require("../services/deliveryService");
const { auth } = require("../middleware/auth");
const Address = require("../models/Address");
const FarmerProfile = require("../models/FarmerProfile");
const Setting = require("../models/Setting");
const { normalizeDeliverySettings } = require("../services/orderService");
const { extractCoordinates, isValidCoordinates } = require("../utils/location");

router.post("/distance", auth, async (req, res) => {
  const { farmerId, addressId } = req.body;
  if (!farmerId || !addressId) {
    return res.status(400).json({ message: "farmerId and addressId are required." });
  }
  const address = await Address.findOne({ _id: addressId, user: req.user._id }).lean();
  if (!address) {
    return res.status(404).json({ message: "Address not found." });
  }
  if (!address.coordinates || !isValidCoordinates(address.coordinates.lat, address.coordinates.lng)) {
    return res.status(400).json({ message: "This address has no coordinates. Please confirm it on a map." });
  }
  const profile = await FarmerProfile.findOne({ user: farmerId }).select("location locationVersion").lean();
  const coords = profile ? extractCoordinates(profile.location) : null;
  if (!coords || !isValidCoordinates(coords.lat, coords.lng)) {
    return res.status(400).json({ message: "Farmer location not configured." });
  }
  const distance = await calculateDistanceKm(coords.lat, coords.lng, address.coordinates.lat, address.coordinates.lng);
  const setting = await Setting.findOne();
  const settingsResolved = normalizeDeliverySettings(setting);
  if (!settingsResolved) {
    return res.status(503).json({ message: "Delivery configuration is incomplete or malformed. Contact support.", code: "DELIVERY_CONFIG_INVALID" });
  }
  const options = deliveryOptionsForDistance(distance, settingsResolved);
  res.json({ distanceKm: distance, options });
});

module.exports = router;
