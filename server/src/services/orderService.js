const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const Setting = require("../models/Setting");
const crypto = require("crypto");
const generateOrderNumber = require("../utils/generateOrderNumber");
const { generateInvoiceNumber } = require("../utils/invoiceNumbers");
const { STATUS_FLOW, FARMER_TRANSITIONS } = require("../constants/orderStatus");
const { getActiveOffers, calculateOffer, computeCartTotals, money } = require("./offerService");
const { isPremiumCustomer, isPremiumAudience } = require("./premiumService");
const {
  calculateDistanceKm,
  deliveryOptionsForDistance,
  eligibleDeliveryCharge,
  RoutingUnavailableError,
} = require("./deliveryService");
const { extractCoordinates, isValidCoordinates } = require("../utils/location");
const { DEFAULT_SETTINGS } = require("../controllers/settingsController");

const DELIVERY_FAILED = "Delivery Failed";

const REQUIRED_SETTING_FIELDS = [
  "deliveryCharge",
  "expressDeliveryCharge",
  "remoteAreaDeliveryCharge",
  "standardMaxKm",
  "expressMaxKm",
  "maxRemoteDistanceKm",
];

function normalizeDeliverySettings(setting) {
  if (!setting) return null;
  const values = {};
  for (const field of REQUIRED_SETTING_FIELDS) {
    const v = Number(setting[field]);
    if (!Number.isFinite(v) || v < 0) return null;
    values[field] = v;
  }
  if (!(values.standardMaxKm < values.expressMaxKm && values.expressMaxKm <= values.maxRemoteDistanceKm)) {
    return null;
  }
  return values;
}

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

async function getFarmerDispatchLocation(farmerId) {
  const FarmerProfile = require("../models/FarmerProfile");
  const profile = await FarmerProfile.findOne({ user: farmerId })
    .select("location locationVersion address farmAddress fullName farmName")
    .lean();
  if (!profile) return null;
  const coords = extractCoordinates(profile.location);
  if (!coords || !isValidCoordinates(coords.lat, coords.lng)) return null;
  return {
    lat: coords.lat,
    lng: coords.lng,
    locationVersion: Number(profile.locationVersion || 0),
    address: profile.address || profile.farmAddress || "",
    farmerName: profile.fullName || profile.farmName || "Farmer",
  };
}

function groupItemsByFarmer(cartItems) {
  const groups = new Map();
  for (const it of cartItems) {
    const fid = String(it.product.farmer);
    if (!groups.has(fid)) groups.set(fid, []);
    groups.get(fid).push(it);
  }
  return groups;
}

function computeQuoteVersion({ shipments, addressId, customerCoords, cartItems, setting, deliveryOption }) {
  const payload = {
    shipments: [...shipments]
      .map((s) => ({
        farmerId: String(s.farmerId),
        lat: s.dispatchLocation && Number.isFinite(s.dispatchLocation.lat) ? s.dispatchLocation.lat : null,
        lng: s.dispatchLocation && Number.isFinite(s.dispatchLocation.lng) ? s.dispatchLocation.lng : null,
        locationVersion: s.locationVersion || 0,
        distanceKm: s.distanceKm == null ? null : s.distanceKm,
      }))
      .sort((a, b) => (a.farmerId < b.farmerId ? -1 : a.farmerId > b.farmerId ? 1 : 0)),
    addressId: addressId || null,
    customerCoords: customerCoords && Number.isFinite(customerCoords.lat) && Number.isFinite(customerCoords.lng)
      ? { lat: customerCoords.lat, lng: customerCoords.lng }
      : null,
    cartItems: [...cartItems]
      .map((it) => ({ product: String(it.product && (it.product._id || it.product)), quantity: Number(it.quantity || 0) }))
      .sort((a, b) => (a.product < b.product ? -1 : a.product > b.product ? 1 : 0)),
    settings: {
      deliveryCharge: Number(setting && setting.deliveryCharge),
      expressDeliveryCharge: Number(setting && setting.expressDeliveryCharge),
      remoteAreaDeliveryCharge: Number(setting && setting.remoteAreaDeliveryCharge),
      standardMaxKm: Number(setting && setting.standardMaxKm),
      expressMaxKm: Number(setting && setting.expressMaxKm),
      maxRemoteDistanceKm: Number(setting && setting.maxRemoteDistanceKm),
    },
    deliveryOption: deliveryOption || null,
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function prepareCheckout(userId, { addressId, deliveryOption } = {}, placedAt = new Date(), directCoordinates = null) {
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

  let customerCoords = null;
  let selectedAddress = null;
  if (addressId) {
    selectedAddress = await Address.findOne({ _id: addressId, user: userId }).lean();
    if (!selectedAddress) {
      throw Object.assign(new Error("Selected delivery address does not belong to you."), { status: 403, code: "DELIVERY_LOCATION_INVALID" });
    }
    if (selectedAddress.coordinates && Number.isFinite(selectedAddress.coordinates.lat) && Number.isFinite(selectedAddress.coordinates.lng)) {
      customerCoords = selectedAddress.coordinates;
    }
  } else if (directCoordinates && isValidCoordinates(directCoordinates.lat, directCoordinates.lng)) {
    customerCoords = { lat: directCoordinates.lat, lng: directCoordinates.lng };
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
          isPremiumExclusive: isPremiumAudience(appliedOffer.offer.audience),
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

  let setting = await Setting.findOne();
  let settingsResolved;
  if (!setting) {
    const err = new Error("Delivery configuration is not configured. Contact support.");
    err.status = 503;
    err.code = "DELIVERY_CONFIG_INVALID";
    throw err;
  }
  settingsResolved = normalizeDeliverySettings(setting);
  if (!settingsResolved) {
    const err = new Error("Delivery configuration is incomplete or malformed. Contact support.");
    err.status = 503;
    err.code = "DELIVERY_CONFIG_INVALID";
    throw err;
  }
  const settingForSnapshot = {
    deliveryCharge: settingsResolved.deliveryCharge,
    expressDeliveryCharge: settingsResolved.expressDeliveryCharge,
    remoteAreaDeliveryCharge: settingsResolved.remoteAreaDeliveryCharge,
    maxRemoteDistanceKm: settingsResolved.maxRemoteDistanceKm,
    expressMaxKm: settingsResolved.expressMaxKm,
    standardMaxKm: settingsResolved.standardMaxKm,
  };

  const farmerGroups = groupItemsByFarmer(cart.items);
  const shipments = [];
  let maxDistanceKm = 0;

  for (const [farmerId, farmerItems] of farmerGroups) {
    const dispatch = await getFarmerDispatchLocation(farmerId);
    const productIds = farmerItems.map((it) => it.product._id);
    const products = farmerItems.map((it) => ({
      id: it.product._id,
      name: it.product.name,
      quantity: it.quantity,
    }));

    if (!dispatch) {
      shipments.push({
        farmerId,
        farmerName: "Farmer",
        dispatchAddress: "",
        farmerItemCount: farmerItems.length,
        productIds,
        products,
        dispatchLocation: null,
        destinationCoordinates: customerCoords,
        distanceKm: null,
        deliveryOptions: [],
        tier: null,
        serviceable: false,
        locationVersion: 0,
        error: "Farmer dispatch location is not configured.",
      });
      continue;
    }
    if (!customerCoords) {
      shipments.push({
        farmerId,
        farmerName: dispatch.farmerName,
        dispatchAddress: dispatch.address,
        farmerItemCount: farmerItems.length,
        productIds,
        products,
        dispatchLocation: { lat: dispatch.lat, lng: dispatch.lng },
        destinationCoordinates: null,
        distanceKm: null,
        deliveryOptions: [],
        tier: null,
        serviceable: false,
        locationVersion: dispatch.locationVersion,
        error: "Customer delivery address has no coordinates.",
      });
      continue;
    }
    let distanceKm;
    try {
      distanceKm = await calculateDistanceKm(dispatch.lat, dispatch.lng, customerCoords.lat, customerCoords.lng);
    } catch (err) {
      shipments.push({
        farmerId,
        farmerName: dispatch.farmerName,
        dispatchAddress: dispatch.address,
        farmerItemCount: farmerItems.length,
        productIds,
        products,
        dispatchLocation: { lat: dispatch.lat, lng: dispatch.lng },
        destinationCoordinates: customerCoords,
        distanceKm: null,
        deliveryOptions: [],
        tier: null,
        serviceable: false,
        locationVersion: dispatch.locationVersion,
        error: err instanceof RoutingUnavailableError ? err.message : "Routing unavailable.",
        routingError: true,
      });
      continue;
    }
    const options = deliveryOptionsForDistance(distanceKm, settingsResolved);
    const eligible = options.find((o) => o.eligible);
    maxDistanceKm = Math.max(maxDistanceKm, distanceKm);
    shipments.push({
      farmerId,
      farmerName: dispatch.farmerName,
      dispatchAddress: dispatch.address,
      farmerItemCount: farmerItems.length,
      productIds,
      products,
      dispatchLocation: { lat: dispatch.lat, lng: dispatch.lng },
      destinationCoordinates: customerCoords,
      distanceKm,
      deliveryOptions: options,
      tier: eligible ? eligible.option : null,
      serviceable: options.length > 0,
      locationVersion: dispatch.locationVersion,
    });
  }

  const serviceableShipments = shipments.filter((s) => s.serviceable);
  const allServiceable = shipments.length > 0 && serviceableShipments.length === shipments.length;

  let deliveryCharge = 0;
  let selectedDeliveryOption = null;
  let distanceKm = null;

  let allOptions = [];

  if (!addressId || !customerCoords) {
    deliveryCharge = 0;
    distanceKm = null;
    allOptions = [];
  } else if (!allServiceable) {
    deliveryCharge = 0;
  } else {
    distanceKm = maxDistanceKm;
    allOptions = deliveryOptionsForDistance(maxDistanceKm, settingsResolved);
    if (deliveryOption) {
      const { charge, option, eligible } = eligibleDeliveryCharge(deliveryOption, allOptions, settingsResolved);
      if (!eligible) {
        throw Object.assign(new Error(`The selected delivery option "${deliveryOption}" is not available for this distance.`), { status: 400 });
      }
      selectedDeliveryOption = option;
      deliveryCharge = charge;
    } else {
      const standard = allOptions.find((o) => o.option === "standard");
      if (standard) {
        selectedDeliveryOption = "standard";
        deliveryCharge = standard.charge;
      } else if (allOptions.length) {
        selectedDeliveryOption = allOptions[0].option;
        deliveryCharge = allOptions[0].charge;
      }
    }
  }

  const { subtotal, regularDiscount, premiumDiscount, discount } = computeCartTotals(items, 0);
  const total = money(Math.max(0, subtotal - discount + deliveryCharge));

  return {
    cart, items, shipments, subtotal, regularDiscount, premiumDiscount, discount,
    deliveryCharge, total, distanceKm, selectedDeliveryOption, maxDistanceKm,
    allServiceable, customerCoords, selectedAddress, setting: settingsResolved, placedAt,
    deliveryOptions: allOptions,
    settingsSnapshot: settingForSnapshot,
    quoteVersion: computeQuoteVersion({
      shipments,
      addressId,
      customerCoords,
      cartItems: cart.items,
      setting: settingsResolved,
      deliveryOption,
      settingsId: setting._id ? String(setting._id) : null,
      settingsUpdatedAt: setting.updatedAt ? setting.updatedAt.toISOString() : null,
    }),
  };
}

async function getCheckoutQuote(userId, { addressId, deliveryOption } = {}) {
  const result = await prepareCheckout(userId, { addressId, deliveryOption });
  return {
    items: result.items,
    shipments: result.shipments,
    subtotal: result.subtotal,
    regularDiscount: result.regularDiscount,
    premiumDiscount: result.premiumDiscount,
    discount: result.discount,
    deliveryCharge: result.deliveryCharge,
    total: result.total,
    distanceKm: result.distanceKm,
    deliveryOption: result.selectedDeliveryOption,
    maxDistanceKm: result.maxDistanceKm,
    allServiceable: result.allServiceable,
    deliveryOptions: result.deliveryOptions,
    quoteVersion: result.quoteVersion,
  };
}

async function createOrder(userId, { address, coordinates, paymentMethod, paymentConfirmed, paymentAmount, addressId, deliveryOption, quoteVersion }) {
  const result = await prepareCheckout(userId, { addressId, deliveryOption }, new Date(), coordinates);

  if (!result.allServiceable) {
    let code = "DELIVERY_NOT_SERVICEABLE";
    let message = "Delivery is not serviceable for one or more items in your cart. Please update your delivery address or contact support.";
    if (addressId && !result.customerCoords) {
      code = "DELIVERY_LOCATION_INVALID";
      message = "The selected delivery address has no valid coordinates. Please update your address and retry.";
    } else if (!addressId && !result.customerCoords) {
      code = "DELIVERY_LOCATION_INVALID";
      message = "A delivery address with valid coordinates is required to place an order.";
    }
    throw Object.assign(new Error(message), { status: 400, code });
  }
  if (quoteVersion == null) {
    throw Object.assign(new Error("A current delivery quote is required before placing this order. Please refresh your cart and retry."), { status: 400, code: "DELIVERY_QUOTE_REQUIRED" });
  }
  if (String(quoteVersion) !== String(result.quoteVersion)) {
    throw Object.assign(new Error("The delivery quote is outdated. The farmer's dispatch location or cart changed; refresh your cart and retry."), { status: 409, code: "DELIVERY_QUOTE_STALE" });
  }
  if (paymentConfirmed === true && ["upi", "card"].includes(String(paymentMethod).toLowerCase())) {
    const confirmedAmount = Number(paymentAmount);
    if (!Number.isFinite(confirmedAmount) || money(confirmedAmount) !== result.total) {
      throw Object.assign(new Error("The payable amount changed. Review your order and retry payment."), { status: 409 });
    }
  }
  const invoiceNumber = await generateInvoiceNumber(result.placedAt);
  let paymentStatus = "Pending";
  if (["upi", "card"].includes(String(paymentMethod).toLowerCase())) {
    if (paymentConfirmed === true) paymentStatus = "Paid";
  }
  const addressSnapshot = result.selectedAddress || { name: address?.name, line1: address?.line1, city: address?.city, phone: address?.phone };
  // Use the request body address for the snapshot (preserves state/postalCode etc.),
  // but validate ownership via result.selectedAddress lookup above.
  const snapshotAddress = address || addressSnapshot;
  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    invoiceNumber,
    invoiceGeneratedAt: result.placedAt,
    user: userId,
    items: result.items,
    address: {
      name: snapshotAddress.name,
      line1: snapshotAddress.line1,
      city: snapshotAddress.city,
      phone: snapshotAddress.phone,
      ...(snapshotAddress.state ? { state: snapshotAddress.state } : {}),
      ...(snapshotAddress.postalCode ? { postalCode: snapshotAddress.postalCode } : {}),
    },
    coordinates: result.customerCoords || coordinates || { lat: 0, lng: 0 },
    paymentMethod, paymentStatus,
    status: "Order Placed",
    statusHistory: [{ status: "Order Placed", at: result.placedAt }],
    subtotal: result.subtotal,
    regularDiscount: result.regularDiscount,
    premiumDiscount: result.premiumDiscount,
    discount: result.discount,
    deliveryCharge: result.deliveryCharge,
    tax: 0,
    total: result.total,
    deliverySnapshot: {
      quoteVersion: result.quoteVersion,
      option: result.selectedDeliveryOption,
      distanceKm: result.distanceKm,
      dispatchLocations: result.shipments.map((s) => ({
        farmerId: s.farmerId,
        farmerName: s.farmerName,
        dispatchAddress: s.dispatchAddress,
        location: s.dispatchLocation,
        distanceKm: s.distanceKm,
        tier: s.tier,
        serviceable: s.serviceable,
        productIds: s.productIds,
      })),
      destinationAddress: snapshotAddress,
      destinationCoordinates: result.customerCoords,
      charge: result.deliveryCharge,
      settingsSnapshot: {
        deliveryCharge: Number(result.settingsSnapshot.deliveryCharge),
        expressDeliveryCharge: Number(result.settingsSnapshot.expressDeliveryCharge),
        remoteAreaDeliveryCharge: Number(result.settingsSnapshot.remoteAreaDeliveryCharge),
        maxRemoteDistanceKm: Number(result.settingsSnapshot.maxRemoteDistanceKm),
        expressMaxKm: Number(result.settingsSnapshot.expressMaxKm),
        standardMaxKm: Number(result.settingsSnapshot.standardMaxKm),
      },
    },
  });
  for (const it of result.cart.items) {
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

module.exports = { createOrder, getCheckoutQuote, updateStatus, updateFarmerStatus, updateCustomerStatus, getItemStatus, normalizeDeliverySettings };
