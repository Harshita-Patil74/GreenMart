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
  const orders = await Order.find({ "items.farmer": req.user._id }).sort({ createdAt: -1 });
  const result = orders.map((o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    items: o.items.filter((it) => String(it.farmer) === String(req.user._id)),
  }));
  res.json(result);
});
module.exports = exports;
