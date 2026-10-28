const Order = require("../models/Order");
const orderService = require("../services/orderService");
const { asyncHandler } = require("../utils/asyncHandler");
const { createNotification } = require("../services/notificationService");
const { emitToUser, emitToFarmer, emitToAdmins } = require("../sockets/emitters");

function farmerOrderView(order, farmerId) {
  const items = order.items.filter((item) => String(item.farmer) === String(farmerId));
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const statuses = [...new Set(items.map((item) => orderService.getItemStatus(item, order.status)))];
  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    status: statuses.length === 1 ? statuses[0] : order.status,
    items: items.map((item) => ({
      _id: item._id,
      product: item.product,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      farmer: item.farmer,
      fulfillmentStatus: orderService.getItemStatus(item, order.status),
      deliveryFailureReason: item.deliveryFailureReason || "",
      fulfillmentHistory: item.fulfillmentHistory || [],
    })),
    subtotal: total,
    total,
    address: order.address?.name ? { name: order.address.name } : {},
  };
}

exports.create = asyncHandler(async (req,res) => {
  const order = await orderService.createOrder(req.user._id, req.body);
  await createNotification({ userId: req.user._id, type: "orderConfirmation", title: "Order placed", message: order.orderNumber, orderId: order._id });
  emitToUser(req.user._id, "order:created", order);
  emitToAdmins("order:created", order);
  // notify farmers
  const farmers = [...new Set(order.items.map(i=>String(i.farmer)))];
  for (const f of farmers) {
    const items = order.items.filter(i=>String(i.farmer)===f);
    await createNotification({ userId: f, type: "newOrderFarmer", title: "New order", message: order.orderNumber, orderId: order._id });
    emitToFarmer(f, "order:created", order);
  }
  res.status(201).json(order);
});
exports.mine = asyncHandler(async (req,res) => res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 })));
exports.farmer = asyncHandler(async (req,res) => {
  const orders = await Order.find({ "items.farmer": req.user._id }).sort({ createdAt: -1 });
  res.json(orders.map((order) => farmerOrderView(order, req.user._id)));
});
exports.get = asyncHandler(async (req,res) => {
  const mongoose = require("mongoose");
  let order;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    order = await Order.findById(req.params.id);
  } else {
    order = await Order.findOne({ orderNumber: req.params.id.replace(/^#/, "") });
  }
  if (!order) return res.status(404).json({ message: "Not found" });
  const isOwner = String(order.user) === String(req.user._id);
  const isFarmer = order.items.some((i) => String(i.farmer) === String(req.user._id));
  if (req.user.role !== "admin" && !isOwner && !isFarmer) return res.status(403).json({ message: "Forbidden" });
  res.json(req.user.role === "farmer" ? farmerOrderView(order, req.user._id) : order);
});
exports.updateStatus = asyncHandler(async (req,res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Not found" });
  const { status, reason = "" } = req.body;
  const allowedStatuses = ["Packed", "Out for Delivery", "Delivered", "Delivery Failed", "Cancelled"];
  if (!allowedStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });
  if (typeof reason !== "string" || reason.length > 500) return res.status(400).json({ message: "Delivery failure reason must be 500 characters or fewer." });

  let updated;
  if (req.user.role === "farmer") {
    updated = await orderService.updateFarmerStatus(req.params.id, req.user._id, status, reason);
  } else {
    updated = await orderService.updateStatus(req.params.id, status);
  }
  if (!updated) return res.status(404).json({ message: "Not found" });
  const notificationMessage = status === "Delivery Failed" ? `${status}: ${reason.trim()}` : status;
  await createNotification({ userId: updated.user, type: "statusUpdate", title: "Order fulfillment update", message: notificationMessage, orderId: updated._id });
  emitToUser(updated.user, "order:statusUpdated", updated);
  emitToAdmins("order:statusUpdated", updated);
  res.json(req.user.role === "farmer" ? farmerOrderView(updated, req.user._id) : updated);
});
exports.updateLocation = asyncHandler(async (req,res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Not found" });
  const isFarmer = order.items.some((i) => String(i.farmer) === String(req.user._id));
  if (req.user.role !== "admin" && !isFarmer) return res.status(403).json({ message: "Forbidden" });
  order.currentLocation = { lat: req.body.lat, lng: req.body.lng, updatedAt: new Date() };
  if (req.body.estimatedDelivery) order.estimatedDelivery = new Date(req.body.estimatedDelivery);
  await order.save();
  emitToUser(order.user, "order:locationUpdated", order);
  res.json(req.user.role === "farmer" ? farmerOrderView(order, req.user._id) : order);
});
exports.adminAll = asyncHandler(async (req,res) => res.json(await Order.find().sort({ createdAt: -1 }).populate("user","name").populate("items.product","name category images unit")));
module.exports = exports;

exports.analytics = asyncHandler(async (req, res) => {
  if (req.user.role !== "farmer") return res.status(403).json({ message: "Forbidden" });
  const days = Number(req.query.days) || 30;
  if (![7, 30, 90].includes(days)) return res.status(400).json({ message: "Invalid date range" });
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);
  const orders = await Order.find({ "items.farmer": req.user._id, status: "Delivered", createdAt: { $gte: since } });
  let revenue = 0;
  let units = 0;
  let orderCount = 0;
  const byDate = {};
  const byProduct = {};
  orders.forEach((order) => {
    const owned = (order.items || []).filter((item) => String(item.farmer) === String(req.user._id));
    if (!owned.length) return;
    orderCount += 1;
    owned.forEach((item) => {
      const amount = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      revenue += amount;
      units += Number(item.quantity) || 0;
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      byDate[key] = (byDate[key] || 0) + amount;
      const name = item.name || "Product";
      if (!byProduct[name]) byProduct[name] = { name, units: 0, revenue: 0 };
      byProduct[name].units += Number(item.quantity) || 0;
      byProduct[name].revenue += amount;
    });
  });
  const topProducts = Object.values(byProduct).sort((a, b) => b.units - a.units).slice(0, 5);
  res.json({ revenue, orders: orderCount, units, byDate, topProducts, days });
});
