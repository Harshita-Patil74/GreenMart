const express = require("express");
const router = express.Router();
const FarmerProfile = require("../models/FarmerProfile");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");
const { approvedFarmer } = require("../middleware/approvedFarmer");
router.get("/", async (req,res) => {
  const profiles = await FarmerProfile.find({ "location.lat": { $exists: true } });
  res.json(profiles);
});
router.put("/me", auth, role("farmer"), approvedFarmer, async (req,res) => {
  const fp = await FarmerProfile.findOneAndUpdate({ user: req.user._id }, { location: { lat: req.body.lat, lng: req.body.lng } }, { new: true, upsert: true });
  res.json(fp);
});
module.exports = router;
