const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const generateOrderNumber = require("../utils/generateOrderNumber");
const { generateInvoiceNumber } = require("../utils/invoiceNumbers");
const { STATUS_FLOW, FARMER_TRANSITIONS } = require("../constants/orderStatus");
const { getActiveOffers, calculateOffer, computeCartTotals, money } = require("./offerService");
const { isPremiumCustomer } = require("./premiumService");

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

async function prepareCheckout(userId, placedAt = new Date()) {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || !cart.items.length) {
    throw Object.assign(new Error("Cart empty"), { status: 400 });
  }
  for (const it of cart.items) {
    const quantity = Number(it.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw Object.assign(new Error("Cart contains an invalid quantity."), { status: 400 });
    }
    if (!it.product || it.product.status !== "Active") {
      throw Object.assign(new Error("A product in your cart is no longer available."), { status: 409 });
    }
    if (!Number.isFinite(Number(it.product.price)) || Number(it.product.price) < 0) {
      throw Object.assign(new Error("A product in your cart has an invalid price."), { status: 409 });
    }
    if (!Number.isFinite(Number(it.product.stock)) || Number(it.product.stock) < quantity) {
      throw Object.assign(new Error("Insufficient stock."), { status: 409 });
    }
  }
  const activeOffers = await getActiveOffers(cart.items.map((item) => item.product._id), placedAt);
  const cartSubtotal = money(cart.items.reduce((sum, item) =>
    sum + Number(item.product.price) * Number(item.quantity), 0));
  const premium = await isPremiumCustomer(userId);
  const items = cart.items.map((it) => {
    const appliedOffer = calculateOffer(it.product, it.quantity, activeOffers, cartSubtotal, premium);
    return {
      product: it.product._id,
      name: it.product.name,
      price: it.product.price,
      quantity: it.quantity,
      image: it.product.images?.[0],
      farmer: it.product.farmer,
      ...(appliedOffer ? {
        offerSnapshot: {
          offerId: appliedOffer.offer._id,
          offerTitle: appliedOffer.offer.title,
          offerType: appliedOffer.offer.type,
          discountType: appliedOffer.offer.discountType,
          discountValue: appliedOffer.offer.discountValue,
          isPremiumExclusive: appliedOffer.offer.audience?.includes("premium") === true,
          originalUnitPrice: Number(it.product.price),
          appliedDiscount: appliedOffer.discount,
          premiumDiscount: appliedOffer.premiumDiscount,
          finalUnitPrice: appliedOffer.finalUnitPrice,
          finalLineTotal: appliedOffer.finalLineTotal,
          isPremium: premium,
        },
      } : {}),
      fulfillmentStatus: "Order Placed",
      fulfillmentHistory: [{ status: "Order Placed", at: placedAt }],
    };
  });
  const setting = await require("../models/Setting").findOne();
  const configuredDelivery = setting && setting.deliveryCharge != null ? Number(setting.deliveryCharge) : 30;
  if (!Number.isFinite(configuredDelivery) || configuredDelivery < 0) {
    throw new Error("The delivery charge is temporarily unavailable.");
  }
  const { subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge, total } = computeCartTotals(items, configuredDelivery);
  return { cart, items, subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge, total, placedAt };
}

async function getCheckoutQuote(userId) {
  const { items, subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge, total } = await prepareCheckout(userId);
  return { items, subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge, total };
}

async function createOrder(userId, { address, coordinates, paymentMethod, paymentConfirmed, paymentAmount }) {
  const { cart, items, subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge, total, placedAt } = await prepareCheckout(userId);
  if (paymentConfirmed === true && ["upi", "card"].includes(String(paymentMethod).toLowerCase())) {
    const confirmedAmount = Number(paymentAmount);
    if (!Number.isFinite(confirmedAmount) || money(confirmedAmount) !== total) {
      throw Object.assign(new Error("The payable amount changed. Review your order and retry payment."), { status: 409 });
    }
  }
  const invoiceNumber = await generateInvoiceNumber(placedAt);
  // Server-side payment status determination: never trust frontend-supplied totals or paymentStatus
  let paymentStatus = "Pending";
  if (["upi", "card"].includes(String(paymentMethod).toLowerCase())) {
    if (paymentConfirmed === true) paymentStatus = "Paid";
  }
  // COD always remains "Pending"
  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    invoiceNumber,
    invoiceGeneratedAt: placedAt,
    user: userId,
    items, address, coordinates, paymentMethod, paymentStatus,
    status: "Order Placed",
    statusHistory: [{ status: "Order Placed", at: placedAt }],
    subtotal, regularDiscount, premiumDiscount, discount, deliveryCharge, total,
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

async function updateCustomerStatus(orderId, userId, status) {
  if (status !== "Cancelled") {
    const error = new Error("Customers can only cancel orders.");
    error.status = 403;
    throw error;
  }
  const order = await Order.findById(orderId);
  if (!order) return null;
  if (String(order.user) !== String(userId)) {
    const error = new Error("You are not authorized to update this order.");
    error.status = 403;
    throw error;
  }
  if (["Delivered", "Cancelled", "Delivery Failed"].includes(order.status)) {
    const error = new Error(`Cannot cancel an order that is ${order.status}.`);
    error.status = 409;
    throw error;
  }
  order.status = "Cancelled";
  order.statusHistory.push({ status: "Cancelled", at: new Date() });
  for (const item of order.items) {
    item.fulfillmentStatus = "Cancelled";
    item.fulfillmentHistory.push({ status: "Cancelled", at: new Date() });
  }
  await order.save();
  return order;
}

module.exports = { createOrder, getCheckoutQuote, updateStatus, updateFarmerStatus, updateCustomerStatus, getItemStatus };
