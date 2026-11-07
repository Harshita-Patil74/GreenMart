const Review = require("../models/Review");
const Product = require("../models/Product");
const User = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");
const { createNotification } = require("../services/notificationService");

exports.eligibility = asyncHandler(async (req,res) => {
  const Order = require("../models/Order");
  const delivered = await Order.findOne({
    user: req.user._id,
    items: { $elemMatch: { product: req.params.id, fulfillmentStatus: "Delivered" } },
  });
  const existing = await (require("../models/Review")).findOne({ product: req.params.id, user: req.user._id });
  if (existing) return res.json({ eligible: false, reason: "already_reviewed" });
  if (!delivered) return res.json({ eligible: false, reason: "not_delivered" });
  res.json({ eligible: true });
});
exports.list = asyncHandler(async (req,res) => {
  const { page=1, limit=10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;
  const [reviews, total] = await Promise.all([
    Review.find({ product: req.params.id }).populate("user","name avatar").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Review.countDocuments({ product: req.params.id }),
  ]);
  res.json({ items: reviews, total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum });
});
exports.create = asyncHandler(async (req,res) => {
  const Order = require("../models/Order");
  const delivered = await Order.findOne({
    user: req.user._id,
    items: { $elemMatch: { product: req.params.id, fulfillmentStatus: "Delivered" } },
  });
  if (!delivered) return res.status(403).json({ message: "You can only review products you received" });
  const existing = await Review.findOne({ product: req.params.id, user: req.user._id });
  if (existing) return res.status(409).json({ message: "You have already reviewed this product" });
  const r = await Review.create({ product: req.params.id, user: req.user._id, rating: req.body.rating, comment: req.body.comment });
  const agg = await Review.aggregate([{ $match: { product: r.product } }, { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }]);
  await Product.updateOne({ _id: r.product }, { ratingAverage: agg[0]?.avg||0, ratingCount: agg[0]?.count||0 });
  // Notify all admins about the new review
  const product = await Product.findById(r.product);
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin._id,
      type: "newReviewAdmin",
      category: "reviews",
      title: "New product review",
      message: `A customer has submitted a review for ${product ? product.name : "a product"}.`,
      resourceType: "Review",
      resourceId: r._id,
    });
  }
  res.status(201).json(r);
});