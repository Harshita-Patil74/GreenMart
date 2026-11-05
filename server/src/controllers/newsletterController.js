const Newsletter = require("../models/Newsletter");
const { asyncHandler } = require("../utils/asyncHandler");
const env = require("../config/env");

exports.subscribe = asyncHandler(async (req, res) => {
  let { email } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ message: "Email address is required" });
  }
  email = String(email).trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }

  const existing = await Newsletter.findOne({ email });
  if (existing) {
    if (!existing.isActive) {
      await Newsletter.findByIdAndUpdate(existing._id, { isActive: true, subscribedAt: Date.now() });
      return res.status(200).json({ message: "Successfully subscribed to GreenMart updates!" });
    }
    return res.status(409).json({ message: "You are already subscribed to GreenMart updates" });
  }

  await Newsletter.create({ email, isActive: true });
  res.status(201).json({ message: "Successfully subscribed to GreenMart updates!" });
});

exports.unsubscribe = asyncHandler(async (req, res) => {
  let { email } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ message: "Email address is required" });
  }
  email = String(email).trim().toLowerCase();

  const existing = await Newsletter.findOne({ email });
  if (!existing) {
    return res.status(404).json({ message: "Email address not found" });
  }

  await Newsletter.findByIdAndUpdate(existing._id, { isActive: false });
  res.json({ message: "You have been unsubscribed from GreenMart updates" });
});

exports.list = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const { isActive } = req.query || {};
  const query = isActive !== undefined ? { isActive: isActive === "true" } : {};
  const subscribers = await Newsletter.find(query).sort({ createdAt: -1 });
  res.json(subscribers);
});

module.exports = exports;
