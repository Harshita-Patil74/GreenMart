const Message = require("../models/Message");
const { createNotification } = require("../services/notificationService");
const { asyncHandler } = require("../utils/asyncHandler");
exports.send = asyncHandler(async (req,res) => {
  const m = await Message.create({ from: req.user._id, to: req.body.to, product: req.body.product, order: req.body.order, text: req.body.text });
  await createNotification({ userId: req.body.to, type: "newMessage", title: "New message", message: req.body.text });
  res.status(201).json(m);
});
exports.list = asyncHandler(async (req,res) => res.json(await Message.find({ $or: [{ from: req.user._id }, { to: req.user._id }] }).sort({ createdAt: -1 })));
module.exports = exports;
