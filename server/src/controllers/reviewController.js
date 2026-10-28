const Review = require("../models/Review");
const Product = require("../models/Product");
const { asyncHandler } = require("../utils/asyncHandler");

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
  const reviews = await Review.find({ product: req.params.id }).populate("user","name avatar");
  res.json(reviews);
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
  res.status(201).json(r);
});