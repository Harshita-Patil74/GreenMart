const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const generateOrderNumber = require("../utils/generateOrderNumber");
const { STATUS_FLOW, FARMER_TRANSITIONS } = require("../constants/orderStatus");

const DELIVERY_FAILED = "Delivery Failed";

function getItemStatus(item, orderStatus) {
  return item.fulfillmentStatus || orderStatus || "Order Placed";
}

function getOverallStatus(items, fallback) {
  if (!items.length) return fallback || "Order Placed";
  const statuses = items.map((item) => getItemStatus(item, fallback));
  if (statuses.every((status) => status === "Cancelled")) return "Cancelled";
  if (statuses.every((status) => status === "Delivered")) return "Delivered";
  if (statuses.includes(DELIVERY_FAILED)) return DELIVERY_FAILED;
  const rank = new Map(STATUS_FLOW.map((status, index) => [status, index]));
  return statuses.reduce((leastAdvanced, status) =>
    (rank.get(status) ?? -1) < (rank.get(leastAdvanced) ?? -1) ? status : leastAdvanced
  );
}

async function createOrder(userId, { address, coordinates, paymentMethod }) {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || !cart.items.length) throw new Error("Cart empty");
  for (const it of cart.items) {
    if (!it.product || it.product.status !== "Active") throw new Error("A product in your cart is no longer available");
    if (it.product.stock < it.quantity) throw new Error("Insufficient stock");
  }
  const placedAt = new Date();
  const items = cart.items.map(it => ({
    product: it.product._id,
    name: it.product.name,
    price: it.product.price,
    quantity: it.quantity,
    farmer: it.product.farmer,
    fulfillmentStatus: "Order Placed",
    fulfillmentHistory: [{ status: "Order Placed", at: placedAt }],
  }));
  const subtotal = items.reduce((s,i)=>s+i.price*i.quantity,0);
  const setting = await require("../models/Setting").findOne();
  const deliveryCharge = setting ? setting.deliveryCharge : 30;
  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: userId,
    items, address, coordinates, paymentMethod,
    status: "Order Placed",
    statusHistory: [{ status: "Order Placed", at: placedAt }],
    subtotal, deliveryCharge, total: subtotal + deliveryCharge,
  });
  // reduce stock
  for (const it of cart.items) {
    await Product.updateOne({ _id: it.product._id }, { $inc: { stock: -it.quantity } });
  }
  await Cart.deleteOne({ user: userId });
  return order;
}

async function updateStatus(orderId, status) {
  const order = await Order.findById(orderId);
  if (!order) return null;
  const allowed = FARMER_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status) && !(order.status === "Delivery Failed" && status === "Cancelled")) {
    const error = new Error(`Cannot change order status from ${order.status} to ${status}.`);
    error.status = 409;
    throw error;
  }
  order.status = status;
  order.statusHistory.push({ status, at: new Date() });
  for (const item of order.items) {
    item.fulfillmentStatus = status;
    item.fulfillmentHistory.push({ status, at: new Date() });
  }
  await order.save();
  return order;
}

async function updateFarmerStatus(orderId, farmerId, status, reason = "") {
  const order = await Order.findById(orderId);
  if (!order) return null;
  const ownItems = order.items.filter((item) => String(item.farmer) === String(farmerId));
  if (!ownItems.length) {
    const error = new Error("You are not authorized to update this order.");
    error.status = 403;
    throw error;
  }

  const currentStatuses = [...new Set(ownItems.map((item) => getItemStatus(item, order.status)))];
  if (currentStatuses.length !== 1 || !FARMER_TRANSITIONS[currentStatuses[0]]?.includes(status)) {
    const error = new Error(`Cannot change your order items from ${currentStatuses.join(", ")} to ${status}.`);
    error.status = 409;
    throw error;
  }
  if (status === DELIVERY_FAILED && !reason.trim()) {
    const error = new Error("A reason is required when delivery fails.");
    error.status = 400;
    throw error;
  }

  const previousStatus = currentStatuses[0];
  const now = new Date();
  const farmerObjectId = ownItems[0].farmer;
  const itemUpdated = await Order.collection.updateOne(
    {
      _id: order._id,
      items: { $elemMatch: { farmer: farmerObjectId } },
      $expr: {
        $eq: [
          {
            $size: {
              $filter: {
                input: "$items",
                as: "item",
                cond: {
                  $and: [
                    { $eq: ["$$item.farmer", farmerObjectId] },
                    { $ne: [{ $ifNull: ["$$item.fulfillmentStatus", previousStatus] }, previousStatus] },
                  ],
                },
              },
            },
          },
          0,
        ],
      },
    },
    {
      $set: {
        "items.$[owned].fulfillmentStatus": status,
        "items.$[owned].deliveryFailureReason": status === DELIVERY_FAILED ? reason.trim() : "",
      },
      $push: {
        "items.$[owned].fulfillmentHistory": { status, reason: reason.trim(), at: now },
      },
    },
    {
      arrayFilters: [{
        "owned.farmer": farmerObjectId,
      }],
    }
  );
  if (!itemUpdated.modifiedCount) {
    const error = new Error("The order changed while you were updating it. Refresh and try again.");
    error.status = 409;
    throw error;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const updated = await Order.findById(orderId);
    if (!updated) return null;
    const overallStatus = getOverallStatus(updated.items, updated.status);
    if (updated.status === overallStatus) return updated;

    const statusUpdated = await Order.updateOne(
      { _id: orderId, status: updated.status },
      {
        $set: { status: overallStatus },
        $push: { statusHistory: { status: overallStatus, reason: status === DELIVERY_FAILED ? reason.trim() : "", at: now } },
      }
    );
    if (statusUpdated.modifiedCount) return Order.findById(orderId);
  }
  const error = new Error("The order changed repeatedly while its status was being updated. Refresh and try again.");
  error.status = 409;
  throw error;
}

module.exports = { createOrder, updateStatus, updateFarmerStatus, getItemStatus };
