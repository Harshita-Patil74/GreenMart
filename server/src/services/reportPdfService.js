const PDFDocument = require("pdfkit");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const REPORT_TYPES = ["Sales Report", "Order Report", "Product Report", "User Report", "Inventory Report"];

function reportError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function getDateFilter(from, to) {
  const filter = {};
  for (const [name, value] of [["from", from], ["to", to]]) {
    if (value) {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        throw reportError(`Invalid ${name} date.`);
      }
    }
  }
  if (from && to && from > to) throw reportError("Start date must be before end date.");
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  return filter;
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString("en-IN") : "";
}

function formatAmount(amount) {
  return `INR ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCellRows(type, { orders, products, users }) {
  if (type === "Order Report") {
    return {
      headers: ["Order ID", "Date", "Customer", "Total", "Status"],
      rows: orders.map((order) => [order.orderNumber || "", formatDate(order.createdAt), order.user?.name || "Customer", formatAmount(order.total), order.status || ""]),
    };
  }
  if (type === "Product Report") {
    return {
      headers: ["Product", "Category", "Price", "Stock", "Status"],
      rows: products.map((product) => [product.name, product.category, formatAmount(product.price), String(product.stock ?? 0), product.status || "Active"]),
    };
  }
  if (type === "Inventory Report") {
    return {
      headers: ["Product", "Category", "Current Stock", "Minimum Stock", "Status"],
      rows: products.map((product) => {
        const minimum = Number(product.lowStockThreshold ?? 10);
        const stock = Number(product.stock || 0);
        return [product.name, product.category, String(stock), String(minimum), stock <= 0 ? "Out of Stock" : stock <= minimum ? "Low Stock" : "In Stock"];
      }),
    };
  }
  if (type === "User Report") {
    return {
      headers: ["Role", "Account Status", "Count"],
      rows: ["customer", "farmer", "admin"].flatMap((role) => ["active", "blocked"].map((status) => [
        role,
        status,
        String(users.filter((user) => user.role === role && (user.status || "active") === status).length),
      ])),
    };
  }
  return {
    headers: ["Order ID", "Date", "Revenue", "Status"],
    rows: orders.filter((order) => order.status !== "Cancelled").map((order) => [
      order.orderNumber || "",
      formatDate(order.createdAt),
      formatAmount(order.total),
      order.status || "",
    ]),
  };
}

function cleanText(value) {
  return String(value ?? "").replace(/[^\u0000-\u00FF]/g, "?");
}

function drawTableHeader(doc, headers, widths, y) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
  doc.rect(36, y, widths.reduce((sum, width) => sum + width, 0), 22).fill("#087449");
  let x = 36;
  headers.forEach((header, index) => {
    doc.fillColor("#ffffff");
    doc.text(cleanText(header), x + 5, y + 7, { width: widths[index] - 10, height: 10, ellipsis: true });
    x += widths[index];
  });
  return y + 22;
}

async function buildReportPdf({ type, from = "", to = "", category = "" }) {
  if (!REPORT_TYPES.includes(type)) throw reportError("Invalid report type.");
  const dateFilter = getDateFilter(from, to);
  const [products, users, queryOrders] = await Promise.all([
    ["Product Report", "Inventory Report"].includes(type) || category
      ? Product.find(category ? { category } : {}).sort({ name: 1 }).lean()
      : Promise.resolve([]),
    type === "User Report" ? User.find().select("role status").lean() : Promise.resolve([]),
    ["Sales Report", "Order Report"].includes(type)
      ? Order.find(dateFilter).populate("user", "name").sort({ createdAt: -1 }).lean()
      : Promise.resolve([]),
  ]);

  const productCategories = new Map(products.map((product) => [String(product._id), product.category]));
  const orders = category
    ? queryOrders.filter((order) => (order.items || []).some((item) => productCategories.get(String(item.product?._id || item.product)) === category))
    : queryOrders;
  const reportData = {
    products: ["Product Report", "Inventory Report"].includes(type) ? products : [],
    users,
    orders,
  };
  const { headers, rows } = getCellRows(type, reportData);

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, compress: false });
  const chunks = [];
  const pdf = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const pageWidth = doc.page.width - 72;
  const widths = headers.map(() => pageWidth / headers.length);
  const period = from || to ? `${from || "Beginning"} to ${to || "Today"}` : "All dates";

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#064B35").text("GreenMart", 36, 36);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#172A27").text(type, 36, 61);
  doc.font("Helvetica").fontSize(9).fillColor("#52615D").text(`Period: ${period}${category ? `  |  Category: ${category}` : ""}`, 36, 81);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 36, 95);

  let y = drawTableHeader(doc, headers, widths, 122);
  rows.forEach((row, rowIndex) => {
    doc.font("Helvetica").fontSize(8);
    const heights = row.map((cell, index) => doc.heightOfString(cleanText(cell), { width: widths[index] - 10, lineGap: 1 }));
    const rowHeight = Math.max(22, Math.min(64, Math.max(...heights) + 10));
    if (y + rowHeight > doc.page.height - 36) {
      doc.addPage();
      y = drawTableHeader(doc, headers, widths, 36);
    }
    if (rowIndex % 2 === 1) {
      doc.rect(36, y, pageWidth, rowHeight).fill("#F3F7F5");
    }
    doc.rect(36, y, pageWidth, rowHeight).lineWidth(0.35).strokeColor("#DCE6E1").stroke();
    let x = 36;
    row.forEach((cell, index) => {
      doc.font("Helvetica").fontSize(8).fillColor("#20312E").text(cleanText(cell), x + 5, y + 5, {
        width: widths[index] - 10,
        height: rowHeight - 8,
        ellipsis: true,
      });
      x += widths[index];
    });
    y += rowHeight;
  });

  if (!rows.length) {
    doc.font("Helvetica").fontSize(9).fillColor("#52615D").text("No records for this report.", 42, y + 12);
  }
  doc.end();
  return pdf;
}

module.exports = { buildReportPdf, REPORT_TYPES };
