const Order = require("../models/Order");
const User = require("../models/User");
const orderService = require("../services/orderService");
const { asyncHandler } = require("../utils/asyncHandler");
const { createNotification } = require("../services/notificationService");
const { emitToUser, emitToFarmer, emitToAdmins } = require("../sockets/emitters");
const mongoose = require("mongoose");
const { ensureInvoiceMetadata } = require("../utils/invoiceNumbers");
const { generateInvoicePDF } = require("../utils/invoice");

function farmerOrderView(order, farmerId) {
  const items = order.items.filter((item) => String(item.farmer) === String(farmerId));
  const total = items.reduce((sum, item) => sum + Number(
    item.offerSnapshot?.finalLineTotal ?? Number(item.price || 0) * Number(item.quantity || 0)
  ), 0);
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
      offerSnapshot: item.offerSnapshot,
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
  const address = req.body.address || {};
  if (!address.name || !address.line1 || !address.city || !address.phone) {
    return res.status(400).json({ message: "A valid delivery address is required." });
  }
  const order = await orderService.createOrder(req.user._id, req.body);
  await createNotification({
    userId: req.user._id,
    type: "orderConfirmation",
    category: "orders",
    title: "Order placed successfully",
    message: `Your order #${order.orderNumber} has been placed successfully.`,
    orderId: order._id,
    orderNumber: order.orderNumber,
  });
  if (order.paymentStatus === "Paid" || order.paymentStatus === "Completed") {
    await createNotification({
      userId: req.user._id,
      type: "paymentSuccess",
      category: "payments",
      title: "Payment successful",
      message: `Payment of ${order.total} for order #${order.orderNumber} was successful.`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      eventKey: `payment:success:${order._id}`,
    });
  }
  emitToUser(req.user._id, "order:created", order);
  emitToAdmins("order:created", order);
  // notify farmers
  const farmers = [...new Set(order.items.map(i=>String(i.farmer)))];
  for (const f of farmers) {
    const farmerView = farmerOrderView(order, f);
    await createNotification({
      userId: f,
      type: "newOrderFarmer",
      category: "orders",
      title: "New order received",
      message: "You have received a new order containing your products.",
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
    emitToFarmer(f, "order:created", farmerView);
  }
  // Notify all admins about the new order
  const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
  for (const admin of admins) {
    await createNotification({
      userId: admin._id,
      type: "newOrderAdmin",
      category: "orders",
      title: "New order received",
      message: `A new order #${order.orderNumber} has been placed on GreenMart.`,
      orderId: order._id,
      resourceType: "Order",
      resourceId: order._id,
      orderNumber: order.orderNumber,
    });
  }
  res.status(201).json(order);
});
exports.mine = asyncHandler(async (req,res) => {
  const { search, page=1, limit=10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const query = { user: req.user._id };
  if (search && search.trim()) {
    const s2 = search.trim().toLowerCase();
    const regex = new RegExp(s2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { orderNumber: regex },
      { paymentMethod: regex },
      { status: regex },
      { "items.product.name": regex },
    ];
  }
  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip((pageNum-1)*limitNum).limit(limitNum).populate("items.product","name category images unit"),
    Order.countDocuments(query),
  ]);
  res.json({ items: orders, total, page: pageNum, pages: Math.ceil(total/limitNum), limit: limitNum });
});
exports.farmer = asyncHandler(async (req,res) => {
  const { search, page=1, limit=10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const query = { "items.farmer": req.user._id };
  if (search && search.trim()) {
    const s2 = search.trim().toLowerCase();
    const regex = new RegExp(s2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { orderNumber: regex },
      { paymentMethod: regex },
      { status: regex },
      { "items.product.name": regex },
    ];
  }
  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip((pageNum-1)*limitNum).limit(limitNum).populate("items.product","name category images unit"),
    Order.countDocuments(query),
  ]);
  res.json({ items: orders.map((order) => farmerOrderView(order, req.user._id)), total, page: pageNum, pages: Math.ceil(total/limitNum), limit: limitNum });
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
  if (req.user.role === "customer") {
    updated = await orderService.updateCustomerStatus(req.params.id, req.user._id, status);
  } else if (req.user.role === "farmer") {
    updated = await orderService.updateFarmerStatus(req.params.id, req.user._id, status, reason);
  } else {
    updated = await orderService.updateStatus(req.params.id, status);
  }
  if (!updated) return res.status(404).json({ message: "Not found" });
  const statusTitles = {
    Packed: "Order packed",
    "Out for Delivery": "Order out for delivery",
    Delivered: "Order delivered",
    Cancelled: "Order cancelled",
    "Delivery Failed": "Delivery failed",
  };
  const statusMessages = {
    Packed: "Your order has been packed and is ready for dispatch.",
    "Out for Delivery": "Your order is out for delivery.",
    Delivered: "Your order has been delivered.",
    Cancelled: "Your order has been cancelled.",
    "Delivery Failed": `Delivery attempt failed${reason.trim() ? `: ${reason.trim()}` : ""}.`,
  };
  const notificationTitle = statusTitles[status] || "Order fulfillment update";
  const notificationMessage = statusMessages[status] || status;
  await createNotification({
    userId: updated.user,
    type: "statusUpdate",
    category: "orders",
    title: notificationTitle,
    message: `${notificationMessage} (Order #${updated.orderNumber})`,
    orderId: updated._id,
    orderNumber: updated.orderNumber,
    status,
  });
  emitToUser(updated.user, "order:statusUpdated", updated);
  emitToAdmins("order:statusUpdated", updated);
  // Notify farmers about status changes affecting their items
  const farmers = [...new Set(updated.items.map(i=>String(i.farmer)))];
  for (const f of farmers) {
    const farmerView = farmerOrderView(updated, f);
    await createNotification({
      userId: f,
      type: "statusUpdate",
      title: notificationTitle,
      message: `Order #${updated.orderNumber} status updated to ${status}.`,
      orderId: updated._id,
      orderNumber: updated.orderNumber,
      status,
    });
    emitToFarmer(f, "order:statusUpdated", farmerView);
  }

  // Notify all admins about order cancellation or delivery failure
  if (["Cancelled", "Delivery Failed"].includes(status)) {
    const admins = await User.find({ role: "admin", status: { $ne: "blocked" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: "orderStatusAdmin",
        category: "orders",
        title: notificationTitle,
        message: `Order #${updated.orderNumber} status updated to ${status}.`,
        orderId: updated._id,
        resourceType: "Order",
        resourceId: updated._id,
        orderNumber: updated.orderNumber,
        status,
      });
    }
  }
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
exports.adminAll = asyncHandler(async (req,res) => {
  const { search, status, from, to } = req.query;
  const rawPage = req.query.page;
  const rawLimit = req.query.limit;
  const pageNum = Number.isInteger(Number(rawPage)) && Number(rawPage) >= 1 ? Number(rawPage) : 1;
  let limitNum = Number.isInteger(Number(rawLimit)) && Number(rawLimit) >= 1 ? Number(rawLimit) : 10;
  if (limitNum > 100) limitNum = 100;
  const validateDate = (value, name) => {
    if (!value) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const error = new Error(`Invalid ${name} date. Expected YYYY-MM-DD.`);
      error.status = 400;
      throw error;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      const error = new Error(`Invalid ${name} date.`);
      error.status = 400;
      throw error;
    }
  };
  validateDate(from, "from");
  validateDate(to, "to");
  if (from && to && from > to) {
    const error = new Error("Start date must be before or equal to end date.");
    error.status = 400;
    throw error;
  }
  const query = {};
  if (search && search.trim()) {
    const s2 = search.trim().toLowerCase();
    const regex = new RegExp(s2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const orConditions = [
      { orderNumber: regex },
      { paymentMethod: regex },
      { status: regex },
      { "items.name": regex },
    ];
    const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select("_id").lean();
    if (matchingUsers.length) {
      orConditions.push({ user: { $in: matchingUsers.map((u) => u._id) } });
    }
    query.$or = orConditions;
  }
  if (status && status !== "All Orders" && status !== "All Status") {
    query.status = status;
  }
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const baseQuery = { ...query };
  delete baseQuery.status;
  const statusCountsAgg = await Order.aggregate([
    { $match: baseQuery },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const statusCounts = {};
  statusCountsAgg.forEach((s) => { statusCounts[s._id || "Unknown"] = s.count; });
  const totalAll = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  statusCounts[""] = totalAll;
  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip((pageNum-1)*limitNum).limit(limitNum).populate("user","name email").populate("items.product","name category images unit"),
    Order.countDocuments(query),
  ]);
  res.json({ items: orders, total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum, statusCounts });
});
exports.analytics = asyncHandler(async (req, res) => {
  if (req.user.role !== "farmer") return res.status(403).json({ message: "Forbidden" });
  const days = Number(req.query.days) || 30;
  if (![7, 30, 90].includes(days)) return res.status(400).json({ message: "Invalid date range" });
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);
  const now = new Date();
  const orders = await Order.find({
    "items.farmer": req.user._id,
    status: { $nin: ["Cancelled", "Delivery Failed"] },
    paymentStatus: { $ne: "Failed" },
    createdAt: { $gte: since, $lte: now },
  }).populate({ path: "items.product", select: "category" });
  let revenue = 0;
  let units = 0;
  let orderCount = 0;
  const byDate = {};
  const byProduct = {};
  const byCategory = {};
  orders.forEach((order) => {
    const owned = (order.items || []).filter((item) => String(item.farmer) === String(req.user._id));
    if (!owned.length) return;
    orderCount += 1;
    owned.forEach((item) => {
      const amount = Number(item.offerSnapshot?.finalLineTotal ?? (item.price || 0) * (item.quantity || 0));
      revenue += amount;
      units += Number(item.quantity) || 0;
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      byDate[key] = (byDate[key] || 0) + amount;
      const name = item.name || "Product";
      if (!byProduct[name]) byProduct[name] = { name, units: 0, revenue: 0 };
      byProduct[name].units += Number(item.quantity) || 0;
      byProduct[name].revenue += amount;
      const category = (item.product && item.product.category) || "Uncategorized";
      if (!byCategory[category]) byCategory[category] = { category, units: 0, revenue: 0 };
      byCategory[category].units += Number(item.quantity) || 0;
      byCategory[category].revenue += amount;
    });
  });
  const topProducts = Object.values(byProduct).sort((a, b) => b.units - a.units).slice(0, 5);
  const topCategories = Object.values(byCategory).sort((a, b) => b.revenue - a.revenue);
  res.json({ revenue, orders: orderCount, units, byDate, topProducts, topCategories, days });
});
module.exports = exports;

async function findInvoiceOrder(id) {
  const isObjectId = /^[a-f\d]{24}$/i.test(id);
  const lookup = isObjectId
    ? Order.findById(new mongoose.Types.ObjectId(id))
    : Order.findOne({ orderNumber: id.replace(/^#/, "").toUpperCase() });
  const order = await lookup
    .populate({ path: "user", select: "name email phone" })
    .populate({ path: "items.product", select: "images", transform: (product, id) => product || id });
  return order;
}

function authorizeInvoiceAccess(order, user) {
  if (!["customer", "admin"].includes(user.role)) return false;
  return user.role === "admin" || String(order.user?._id || order.user) === String(user._id);
}

function invoiceResponse(order) {
  const address = order.address || {};
  const user = order.user || {};
  const items = (order.items || []).map((item) => {
    const product = item.product && typeof item.product === "object" ? item.product : null;
    return {
      productId: product?._id || item.product || null,
      farmerId: item.farmer || null,
      name: item.name || "Product",
      image: item.image || product?.images?.[0] || "",
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.price) || 0,
      subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 0),
    };
  });
  return {
    invoiceNumber: order.invoiceNumber,
    invoiceDate: order.invoiceGeneratedAt || order.createdAt,
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    status: order.status,
    paymentMethod: order.paymentMethod || "Cash on Delivery",
    paymentStatus: order.paymentStatus || "Pending",
    customer: {
      name: address.name || user.name || "",
      email: user.email || "",
      phone: address.phone || user.phone || "",
    },
    address: {
      line1: address.line1 || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postalCode || "",
    },
    items,
    summary: {
      subtotal: Number(order.subtotal) || 0,
      deliveryCharge: Number(order.deliveryCharge) || 0,
      discount: Number(order.discount) || 0,
      tax: Number(order.tax) || 0,
      total: Number(order.total) || 0,
    },
  };
}

async function loadAuthorizedInvoice(req, res) {
  const validOrderId = /^[a-f\d]{24}$/i.test(req.params.id);
  const validOrderNumber = /^#?GM\d{6}$/i.test(req.params.id);
  if (!validOrderId && !validOrderNumber) {
    res.status(400).json({ message: "Invalid order ID." });
    return null;
  }
  const order = await findInvoiceOrder(req.params.id);
  if (!order) {
    res.status(404).json({ message: "Order not found." });
    return null;
  }
  if (!authorizeInvoiceAccess(order, req.user)) {
    res.status(404).json({ message: "Order not found." });
    return null;
  }
  await ensureInvoiceMetadata(order);
  return order;
}

exports.invoice = asyncHandler(async (req, res) => {
  if (!["customer", "admin"].includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  const order = await loadAuthorizedInvoice(req, res);
  if (!order) return;
  res.set("Cache-Control", "private, no-store").json(invoiceResponse(order));
});

exports.invoiceDownload = asyncHandler(async (req, res) => {
  if (!["customer", "admin"].includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  const order = await loadAuthorizedInvoice(req, res);
  if (!order) return;
  const { doc, invoiceNumber } = await generateInvoicePDF(order);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="GreenMart-Invoice-${invoiceNumber}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store");
  doc.pipe(res);
  doc.end();
});
