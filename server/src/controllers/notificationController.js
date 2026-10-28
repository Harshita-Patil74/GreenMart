const Notification = require("../models/Notification");
const { asyncHandler } = require("../utils/asyncHandler");
exports.list = asyncHandler(async (req,res) => res.json(await Notification.find({ user: req.user._id }).sort({ createdAt: -1 })));
exports.unreadCount = asyncHandler(async (req,res) => res.json({ count: await Notification.countDocuments({ user: req.user._id, isRead: false }) }));
exports.markRead = asyncHandler(async (req,res) => { await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { isRead: true }); res.json({ message: "ok" }); });
exports.markAllRead = asyncHandler(async (req,res) => { await Notification.updateMany({ user: req.user._id }, { isRead: true }); res.json({ message: "ok" }); });
