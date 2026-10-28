module.exports = {
  ORDER_PLACED: "Order Placed",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  DELIVERY_FAILED: "Delivery Failed",
  CANCELLED: "Cancelled",
  STATUS_FLOW: ["Order Placed","Packed","Out for Delivery","Delivered"],
  FARMER_TRANSITIONS: {
    "Order Placed": ["Packed", "Cancelled"],
    Packed: ["Out for Delivery", "Cancelled"],
    "Out for Delivery": ["Delivered", "Delivery Failed", "Cancelled"],
    "Delivery Failed": ["Out for Delivery", "Cancelled"],
  },
};
