const express = require("express");
const router = express.Router();
const FarmerProfile = require("../models/FarmerProfile");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");
const { approvedFarmer } = require("../middleware/approvedFarmer");
const { clearDeliveryCache } = require("../services/deliveryService");
router.get("/", async (req,res) => {
  const profiles = await FarmerProfile.find({ "location.lat": { $exists: true } });
  res.json(profiles);
});
router.put("/me", auth, role("farmer"), approvedFarmer, async (req,res) => {
  const latitude = Number(req.body.lat);
  const longitude = Number(req.body.lng);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({ message: "Latitude is required and must be between -90 and 90." });
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ message: "Longitude is required and must be between -180 and 180." });
  }
  const fp = await FarmerProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: { location: { lat: latitude, lng: longitude } }, $inc: { locationVersion: 1 } },
    { new: true, upsert: true },
  );
  clearDeliveryCache();
  res.json(fp);
});
module.exports = router;
