const Order = require("../models/Order");
const { asyncHandler } = require("../utils/asyncHandler");

exports.overview = asyncHandler(async (req,res) => {
  const orders = await Order.find({ "items.farmer": req.user._id });
  let revenue = 0, qty = 0, count = 0;
  orders.forEach((o) => o.items.forEach((it) => {
    if (String(it.farmer) === String(req.user._id)) {
      revenue += it.offerSnapshot?.finalLineTotal ?? (it.price || 0) * (it.quantity || 0);
      qty += it.quantity || 0;
      count += 1;
    }
  }));
  res.json({ totalRevenue: revenue, totalOrders: orders.length, totalProductsSold: count, totalQuantitySold: qty });
});
exports.list = asyncHandler(async (req,res) => {
  const { page=1, limit=10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;
  const query = { "items.farmer": req.user._id };
  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Order.countDocuments(query),
  ]);
  const result = orders.map((o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    items: o.items.filter((it) => String(it.farmer) === String(req.user._id)),
  }));
  res.json({ items: result, total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum });
});
module.exports = exports;
