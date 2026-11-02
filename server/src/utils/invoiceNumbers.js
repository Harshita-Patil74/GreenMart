const InvoiceCounter = require("../models/InvoiceCounter");
const Order = require("../models/Order");

async function generateInvoiceNumber(date = new Date()) {
  const year = new Date(date).getFullYear();
  if (!Number.isInteger(year)) throw new Error("Cannot generate an invoice number for an invalid date.");

  let counter;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      counter = await InvoiceCounter.findOneAndUpdate(
        { _id: year },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
      break;
    } catch (error) {
      if (error.code !== 11000 || attempt === 1) throw error;
    }
  }

  if (!counter) throw new Error("Could not allocate an invoice number.");
  return `GM-INV-${year}-${String(counter.sequence).padStart(6, "0")}`;
}

async function ensureInvoiceMetadata(order) {
  const invoiceDate = order.invoiceGeneratedAt || order.createdAt || new Date();

  if (order.invoiceNumber) {
    if (!order.invoiceGeneratedAt) {
      await Order.updateOne(
        { _id: order._id, invoiceNumber: order.invoiceNumber, $or: [{ invoiceGeneratedAt: { $exists: false } }, { invoiceGeneratedAt: null }] },
        { $set: { invoiceGeneratedAt: invoiceDate } }
      );
      order.invoiceGeneratedAt = invoiceDate;
    }
    return order;
  }

  const invoiceNumber = await generateInvoiceNumber(invoiceDate);
  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      $or: [{ invoiceNumber: { $exists: false } }, { invoiceNumber: null }, { invoiceNumber: "" }],
    },
    { $set: { invoiceNumber, invoiceGeneratedAt: invoiceDate } },
    { new: true }
  );

  if (updated) {
    order.invoiceNumber = updated.invoiceNumber;
    order.invoiceGeneratedAt = updated.invoiceGeneratedAt;
    return order;
  }

  const existing = await Order.findById(order._id).select("invoiceNumber invoiceGeneratedAt createdAt");
  if (!existing?.invoiceNumber) throw new Error("Could not persist invoice metadata for this order.");
  order.invoiceNumber = existing.invoiceNumber;
  order.invoiceGeneratedAt = existing.invoiceGeneratedAt || existing.createdAt;
  return order;
}

module.exports = { generateInvoiceNumber, ensureInvoiceMetadata };
