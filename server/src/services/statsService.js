const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");

async function adminStats(from, to) {
  const q = {};
  if (from || to) { q.createdAt = {}; if (from) q.createdAt.$gte = new Date(from); if (to) q.createdAt.$lte = new Date(to); }
  const [products, orders, farmers, users] = await Promise.all([
    Product.countDocuments(q),
    Order.countDocuments(q),
    FarmerProfile.countDocuments(),
    User.countDocuments({ role: "customer" }),
  ]);
  return { totalProducts: products, totalOrders: orders, totalFarmers: farmers, totalUsers: users };
}
async function sales() {
  const now = new Date();
  const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLast = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const endLast = new Date(now.getFullYear(), now.getMonth(), 0);
  const thisMonth = await Order.aggregate([{ $match: { createdAt: { $gte: startThis } } }, { $group: { _id: null, total: { $sum: "$total" } } }]);
  const lastMonth = await Order.aggregate([{ $match: { createdAt: { $gte: startLast, $lte: endLast } } }, { $group: { _id: null, total: { $sum: "$total" } } }]);
  return { thisMonth: thisMonth[0]?.total||0, lastMonth: lastMonth[0]?.total||0 };
}
async function categoriesShare() {
  const agg = await Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
  return agg.map(a => ({ category: a._id, count: a.count }));
}
module.exports = { adminStats, sales, categoriesShare };
