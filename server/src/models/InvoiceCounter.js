const mongoose = require("mongoose");

const InvoiceCounterSchema = new mongoose.Schema({
  _id: Number,
  sequence: { type: Number, default: 0 },
});

module.exports = mongoose.model("InvoiceCounter", InvoiceCounterSchema);
