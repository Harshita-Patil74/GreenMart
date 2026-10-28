const mongoose = require("mongoose");
const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: String,
  price: Number,
  quantity: Number,
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  fulfillmentStatus: String,
  deliveryFailureReason: String,
  fulfillmentHistory: [{ status: String, reason: String, at: { type: Date, default: Date.now } }],
});
const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [OrderItemSchema],
  address: { name: String, line1: String, city: String, phone: String },
  coordinates: { lat: Number, lng: Number },
  paymentMethod: String,
  status: { type: String, default: "Order Placed" },
  statusHistory: [{ status: String, reason: String, at: { type: Date, default: Date.now } }],
  subtotal: Number,
  deliveryCharge: Number,
  total: Number,
  estimatedDelivery: Date,
  currentLocation: { lat: Number, lng: Number, updatedAt: Date },
  isDemo: { type: Boolean, default: false } }, { timestamps: true });
module.exports = mongoose.model("Order", OrderSchema);



