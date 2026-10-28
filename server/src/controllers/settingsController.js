const Setting = require("../models/Setting");
const { asyncHandler } = require("../utils/asyncHandler");
const DEFAULT_SETTINGS = {
  deliveryCharge: 30,
  expressDeliveryCharge: 4,
  remoteAreaDeliveryCharge: 7,
};
const DELIVERY_CHARGE_FIELDS = Object.keys(DEFAULT_SETTINGS);

exports.get = asyncHandler(async (req, res) => {
  const settings = await Setting.findOne();
  res.json(settings || DEFAULT_SETTINGS);
});

exports.update = asyncHandler(async (req, res) => {
  const updates = {};
  for (const field of DELIVERY_CHARGE_FIELDS) {
    if (req.body[field] === undefined) continue;
    const amount = req.body[field];
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: `${field} must be a valid non-negative amount.` });
    }
    updates[field] = amount;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: "Provide at least one delivery charge to update." });
  }

  const settings = await Setting.findOneAndUpdate({}, { $set: updates }, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  });
  res.json(settings);
});
module.exports = exports;
