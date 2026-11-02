const request = require("supertest");
const bcrypt = require("bcryptjs");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { EventEmitter } = require("events");
const { Readable } = require("stream");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const env = require("../src/config/env");
const jwt = require("jsonwebtoken");
const cloudinary = require("../src/config/cloudinary");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Cart = require("../src/models/Cart");
const Order = require("../src/models/Order");
const { signToken } = require("../src/utils/tokens");

let customer;
let otherCustomer;
let parallelCustomer;
let farmer;
let secondFarmer;
let admin;
let customerToken;
let otherCustomerToken;
let parallelCustomerToken;
let farmerToken;
let adminToken;
let order;
let invoiceTestSequence = 0;

beforeAll(async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash("ValidPass1!", 10);
  [customer, otherCustomer, parallelCustomer, farmer, secondFarmer, admin] = await User.create([
    { name: "Invoice Customer", email: "invoice.customer@example.test", passwordHash, role: "customer", phone: "1112223333" },
    { name: "Other Customer", email: "invoice.other@example.test", passwordHash, role: "customer" },
    { name: "Parallel Customer", email: "invoice.parallel@example.test", passwordHash, role: "customer" },
    { name: "Invoice Farmer", email: "invoice.farmer@example.test", passwordHash, role: "farmer" },
    { name: "Second Invoice Farmer", email: "invoice.farmer2@example.test", passwordHash, role: "farmer" },
    { name: "Invoice Admin", email: "invoice.admin@example.test", passwordHash, role: "admin" },
  ]);
  customerToken = signToken(customer);
  otherCustomerToken = signToken(otherCustomer);
  parallelCustomerToken = signToken(parallelCustomer);
  farmerToken = signToken(farmer);
  adminToken = signToken(admin);

  const [firstProduct, secondProduct] = await Product.create([
    { name: "Organic Apples", description: "Fresh apples", category: "Fruits", price: 60, stock: 20, images: ["/images/products/apples.jpg"], farmer: farmer._id },
    { name: "Green Lentils", description: "Organic lentils", category: "Grains & Pulses", price: 45, stock: 20, images: ["/images/products/brown-rice.jpg"], farmer: secondFarmer._id },
  ]);
  await Cart.create({
    user: customer._id,
    items: [{ product: firstProduct._id, quantity: 2 }, { product: secondProduct._id, quantity: 1 }],
  });

  const response = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({
      address: {
        name: "Invoice Customer",
        line1: "12 Market Road",
        city: "Gadag",
        state: "Karnataka",
        postalCode: "582101",
        phone: "9998887777",
      },
      paymentMethod: "Cash on Delivery",
    });
  expect(response.status).toBe(201);
  order = await Order.findById(response.body._id);
  await Order.updateOne(
    { _id: order._id },
    { $set: { discount: 5, tax: 2, total: order.subtotal + order.deliveryCharge - 5 + 2 } }
  );
  order = await Order.findById(order._id);
});

afterAll(async () => {
  await disconnectDB();
});

describe("order invoices", () => {
  it("creates and stores a unique readable invoice number when the order is placed", async () => {
    expect(order.invoiceNumber).toMatch(/^GM-INV-\d{4}-\d{6}$/);
    expect(order.invoiceGeneratedAt).toBeInstanceOf(Date);
  });

  it("allocates a different invoice number for each newly placed order", async () => {
    await Cart.create([
      { user: otherCustomer._id, items: [{ product: order.items[0].product, quantity: 1 }] },
      { user: parallelCustomer._id, items: [{ product: order.items[1].product, quantity: 1 }] },
    ]);
    const responses = await Promise.all([
      request(app).post("/api/orders").set("Authorization", `Bearer ${otherCustomerToken}`)
        .send({ address: { name: "Other Customer", line1: "2 Farm Lane", city: "Gadag", phone: "1231231234" }, paymentMethod: "Cash on Delivery" }),
      request(app).post("/api/orders").set("Authorization", `Bearer ${parallelCustomerToken}`)
        .send({ address: { name: "Parallel Customer", line1: "3 Farm Lane", city: "Gadag", phone: "4564564567" }, paymentMethod: "Cash on Delivery" }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses[0].body.invoiceNumber).toMatch(/^GM-INV-\d{4}-\d{6}$/);
    expect(responses[1].body.invoiceNumber).toMatch(/^GM-INV-\d{4}-\d{6}$/);
    expect(responses[0].body.invoiceNumber).not.toBe(responses[1].body.invoiceNumber);
    expect(responses[0].body.invoiceNumber).not.toBe(order.invoiceNumber);
    expect(responses[1].body.invoiceNumber).not.toBe(order.invoiceNumber);
  });

  it("returns saved customer, delivery, line item and payment values for the order owner", async () => {
    const response = await request(app)
      .get(`/api/orders/${order._id}/invoice`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.invoiceNumber).toBe(order.invoiceNumber);
    expect(response.body.customer).toEqual({
      name: "Invoice Customer",
      email: "invoice.customer@example.test",
      phone: "9998887777",
    });
    expect(response.body.address).toEqual({
      line1: "12 Market Road",
      city: "Gadag",
      state: "Karnataka",
      postalCode: "582101",
    });
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items.map((item) => item.quantity)).toEqual([2, 1]);
    expect(response.body.items.map((item) => item.unitPrice)).toEqual([60, 45]);
    expect(response.body.items[0].image).toBe("/images/products/apples.jpg");
    expect(response.body.items[0].farmerId).toBe(String(farmer._id));
    expect(response.body.items[1].farmerId).toBe(String(secondFarmer._id));
    expect(response.body.summary).toEqual({
      subtotal: 165,
      deliveryCharge: 30,
      discount: 5,
      tax: 2,
      total: 192,
    });
  });

  it("keeps historical line prices and invoice metadata unchanged across repeat requests and status changes", async () => {
    const first = await request(app)
      .get(`/api/orders/${order._id}/invoice`)
      .set("Authorization", `Bearer ${customerToken}`);
    const invoiceDate = first.body.invoiceDate;
    await Product.updateOne({ _id: order.items[0].product }, { $set: { price: 999 } });
    const statusUpdate = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "Packed" });
    expect(statusUpdate.status).toBe(200);

    const [repeated, concurrent] = await Promise.all([
      request(app).get(`/api/orders/${order._id}/invoice`).set("Authorization", `Bearer ${customerToken}`),
      request(app).get(`/api/orders/${order._id}/invoice`).set("Authorization", `Bearer ${customerToken}`),
    ]);

    expect(repeated.body.invoiceNumber).toBe(order.invoiceNumber);
    expect(concurrent.body.invoiceNumber).toBe(order.invoiceNumber);
    expect(repeated.body.invoiceDate).toBe(invoiceDate);
    expect(repeated.body.status).toBe("Packed");
    expect(repeated.body.items[0].unitPrice).toBe(60);
  });

  it("allocates one invoice number under concurrent access to an older order", async () => {
    const legacyOrder = await Order.create({
      user: otherCustomer._id,
      orderNumber: "GM654321",
      items: [{ product: order.items[0].product, name: "Historical Figs", price: 60, quantity: 1, farmer: farmer._id }],
      address: { name: "Other Customer", line1: "2 Farm Lane", city: "Gadag", phone: "1231231234" },
      paymentMethod: "Cash on Delivery",
      subtotal: 60,
      deliveryCharge: 30,
      total: 90,
      status: "Order Placed",
    });

    const [first, second] = await Promise.all([
      request(app).get(`/api/orders/${legacyOrder._id}/invoice`).set("Authorization", `Bearer ${otherCustomerToken}`),
      request(app).get(`/api/orders/${legacyOrder._id}/invoice`).set("Authorization", `Bearer ${otherCustomerToken}`),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.invoiceNumber).toMatch(/^GM-INV-\d{4}-\d{6}$/);
    expect(second.body.invoiceNumber).toBe(first.body.invoiceNumber);
    expect(String(first.body.invoiceDate)).toBe(String(second.body.invoiceDate));
    expect(first.body.invoiceNumber).not.toBe(order.invoiceNumber);
  });

  it("allows administrators and rejects other customers and farmers", async () => {
    const [owner, administrator, other, farmerResponse] = await Promise.all([
      request(app).get(`/api/orders/${order._id}/invoice`).set("Authorization", `Bearer ${customerToken}`),
      request(app).get(`/api/orders/${order._id}/invoice`).set("Authorization", `Bearer ${adminToken}`),
      request(app).get(`/api/orders/${order._id}/invoice`).set("Authorization", `Bearer ${otherCustomerToken}`),
      request(app).get(`/api/orders/${order._id}/invoice`).set("Authorization", `Bearer ${farmerToken}`),
    ]);

    expect(owner.status).toBe(200);
    expect(administrator.status).toBe(200);
    expect(other.status).toBe(404);
    expect(farmerResponse.status).toBe(403);
  });

  it("rejects guest, invalid-token and invalid-order-ID requests", async () => {
    const [guest, invalidToken, expiredToken, invalidId] = await Promise.all([
      request(app).get(`/api/orders/${order._id}/invoice`),
      request(app).get(`/api/orders/${order._id}/invoice`).set("Authorization", "Bearer invalid"),
      request(app).get(`/api/orders/${order._id}/invoice`)
        .set("Authorization", `Bearer ${jwt.sign({ id: customer._id }, env.jwtSecret, { expiresIn: -1 })}`),
      request(app).get("/api/orders/not-an-order/invoice").set("Authorization", `Bearer ${customerToken}`),
    ]);

    expect(guest.status).toBe(401);
    expect(invalidToken.status).toBe(401);
    expect(expiredToken.status).toBe(401);
    expect(invalidId.status).toBe(400);
  });

  it("downloads a valid PDF with a stable invoice filename", async () => {
    const response = await request(app)
      .get(`/api/orders/${order._id}/invoice/download`)
      .set("Authorization", `Bearer ${customerToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain(`GreenMart-Invoice-${order.invoiceNumber}.pdf`);
    expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
    expect((response.body.toString("latin1").match(/\/Subtype \/Image/g) || []).length).toBe(5);
    expect(getPdfText(response.body)).toContain(order.invoiceNumber);
    expect(getPdfText(response.body)).toContain(order.orderNumber);
    expect(getPdfText(response.body)).toContain("Invoice Customer");
  });

  it("embeds each ordered product's own hosted image in the PDF", async () => {
    const cloudName = cloudinary.config().cloud_name || "test";
    const imagePaths = {
      apples: path.resolve(__dirname, "../../client/public/images/products/apples.jpg"),
      rice: path.resolve(__dirname, "../../client/public/images/products/brown-rice.jpg"),
      logo: path.resolve(__dirname, "../../client/public/images/greenmart-logo.png"),
    };
    const imageBuffers = {
      apples: fs.readFileSync(imagePaths.apples),
      rice: fs.readFileSync(imagePaths.rice),
      logo: fs.readFileSync(imagePaths.logo),
    };
    const urls = [
      `http://res.cloudinary.com/legacy-cloud/image/upload/v1/invoice-test/apples.jpg`,
      `https://res.cloudinary.com/${cloudName}/image/upload/v1/invoice-test/rice.jpg`,
    ];
    const hostedOrder = await createInvoiceOrder([
      { product: order.items[0].product, name: "Organic Apples", price: 60, quantity: 2, image: urls[0], farmer: farmer._id },
      { product: order.items[1].product, name: "Green Lentils", price: 45, quantity: 1, image: urls[1], farmer: secondFarmer._id },
    ]);
    const imageRequest = mockHostedImages({
      "apples.jpg": { image: imageBuffers.apples, contentType: "image/jpeg" },
      "rice.jpg": { image: imageBuffers.logo, contentType: "image/png" },
    });

    try {
      const response = await downloadInvoice(hostedOrder._id);
      expect(response.status).toBe(200);
      expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
      expect(imageRequest).toHaveBeenCalledTimes(2);
      expect(imageRequest.mock.calls.map(([url]) => url.pathname)).toEqual([
        "/legacy-cloud/image/upload/v1/invoice-test/apples.jpg",
        `/${cloudName}/image/upload/v1/invoice-test/rice.jpg`,
      ]);
      expect(imageRequest.mock.calls[0][0].protocol).toBe("https:");
      expect((response.body.toString("latin1").match(/\/Subtype \/Image/g) || []).length).toBe(6);
      expect(getPdfText(response.body)).toContain("Organic Apples");
      expect(getPdfText(response.body)).toContain("Green Lentils");
    } finally {
      imageRequest.mockRestore();
    }
  });

  it.each(["webp", "avif"])("converts a Cloudinary %s image to PDFKit-compatible JPEG", async (format) => {
    const cloudName = cloudinary.config().cloud_name || "test";
    const sourcePath = `/image/upload/f_auto/v1/invoice-test/produce.${format}`;
    const sourceImage = format === "webp"
      ? Buffer.from("RIFF0000WEBPVP8 ")
      : Buffer.from("0000ftypavif0000");
    const url = `https://res.cloudinary.com/${cloudName}${sourcePath}`;
    const hostedOrder = await createInvoiceOrder([{
      product: (await createInvoiceProduct(`${format.toUpperCase()} Product`))._id,
      name: `${format.toUpperCase()} Product`,
      price: 18,
      quantity: 1,
      image: url,
      farmer: farmer._id,
    }]);
    const imageRequest = mockHostedImages({
      [`produce.${format}`]: {
        image: sourceImage,
        contentType: `image/${format}`,
      },
      "f_jpg/": {
        image: fs.readFileSync(path.resolve(__dirname, "../../client/public/images/products/apples.jpg")),
        contentType: "image/jpeg",
      },
    });

    try {
      const response = await downloadInvoice(hostedOrder._id);
      expect(response.status).toBe(200);
      expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
      expect(imageRequest).toHaveBeenCalledTimes(2);
      expect(imageRequest.mock.calls[1][0].pathname).toContain("/f_jpg/");
      expect(imageRequest.mock.calls[1][0].pathname).not.toContain("/f_auto/");
      expect((response.body.toString("latin1").match(/\/Subtype \/Image/g) || []).length).toBe(4);
    } finally {
      imageRequest.mockRestore();
    }
  });

  it("uses the referenced Product's primary image when an older order has no image snapshot", async () => {
    const historicalOrder = await createInvoiceOrder([{
      product: order.items[0].product,
      name: "Organic Apples",
      price: 60,
      quantity: 1,
      farmer: farmer._id,
    }]);
    const imageRequest = jest.spyOn(https, "get");

    try {
      const response = await downloadInvoice(historicalOrder._id);
      expect(response.status).toBe(200);
      expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
      expect(imageRequest).not.toHaveBeenCalled();
      expect((response.body.toString("latin1").match(/\/Subtype \/Image/g) || []).length).toBe(4);
    } finally {
      imageRequest.mockRestore();
    }
  });

  it("shows a neutral fallback for a missing image and safely rejects an untrusted URL", async () => {
    const imageId = (await createInvoiceProduct("Image Missing Product"))._id;
    const missingImageOrder = await createInvoiceOrder([{
      product: imageId,
      name: "Image Missing Product",
      price: 12,
      quantity: 1,
      image: "https://res.cloudinary.com.evil.example/test/image/upload/missing.jpg",
      farmer: farmer._id,
    }]);
    const imageRequest = jest.spyOn(https, "get");
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const response = await downloadInvoice(missingImageOrder._id);
      expect(response.status).toBe(200);
      expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
      expect(imageRequest).not.toHaveBeenCalled();
      expect((response.body.toString("latin1").match(/\/Subtype \/Image/g) || []).length).toBe(3);
      expect(warning).toHaveBeenCalledWith(
        "Invoice product image unavailable",
        expect.stringContaining('"category":"untrusted-provider"')
      );
      expect(warning.mock.calls[0][1]).toContain(`"orderId":"${missingImageOrder._id}"`);
      expect(warning.mock.calls[0][1]).toContain('"productName":"Image Missing Product"');
      expect(warning.mock.calls[0][1]).toContain('"imageHost":"res.cloudinary.com.evil.example"');
    } finally {
      imageRequest.mockRestore();
      warning.mockRestore();
    }
  });

  it("follows only trusted HTTPS image redirects", async () => {
    const cloudName = cloudinary.config().cloud_name || "test";
    const redirectedOrder = await createInvoiceOrder([{
      product: (await createInvoiceProduct("Redirected Product"))._id,
      name: "Redirected Product",
      price: 18,
      quantity: 1,
      image: `https://res.cloudinary.com/${cloudName}/image/upload/v1/invoice-test/redirect.jpg`,
      farmer: farmer._id,
    }]);
    const imageRequest = mockHostedImages({
      "redirect.jpg": {
        statusCode: 302,
        headers: { location: `/${cloudName}/image/upload/v1/invoice-test/final.jpg` },
      },
      "final.jpg": {
        image: fs.readFileSync(path.resolve(__dirname, "../../client/public/images/products/apples.jpg")),
        contentType: "image/jpeg",
      },
    });

    try {
      const response = await downloadInvoice(redirectedOrder._id);
      expect(response.status).toBe(200);
      expect(imageRequest).toHaveBeenCalledTimes(2);
      expect(imageRequest.mock.calls[1][0].protocol).toBe("https:");
      expect((response.body.toString("latin1").match(/\/Subtype \/Image/g) || []).length).toBe(4);
    } finally {
      imageRequest.mockRestore();
    }
  });

  it("rejects image redirects to untrusted hosts", async () => {
    const cloudName = cloudinary.config().cloud_name || "test";
    const redirectOrder = await createInvoiceOrder([{
      product: (await createInvoiceProduct("Untrusted Redirect Product"))._id,
      name: "Untrusted Redirect Product",
      price: 18,
      quantity: 1,
      image: `https://res.cloudinary.com/${cloudName}/image/upload/v1/invoice-test/redirect.jpg`,
      farmer: farmer._id,
    }]);
    const imageRequest = mockHostedImages({
      "redirect.jpg": {
        statusCode: 302,
        headers: { location: "http://127.0.0.1/admin" },
      },
    });
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const response = await downloadInvoice(redirectOrder._id);
      expect(response.status).toBe(200);
      expect(imageRequest).toHaveBeenCalledTimes(1);
      expect(warning.mock.calls[0][1]).toContain('"category":"untrusted-redirect"');
    } finally {
      imageRequest.mockRestore();
      warning.mockRestore();
    }
  });

  it("keeps the PDF valid and uses a neutral fallback when hosted image download times out", async () => {
    const cloudName = cloudinary.config().cloud_name || "test";
    const timeoutOrder = await createInvoiceOrder([{
      product: (await createInvoiceProduct("Slow Image Product"))._id,
      name: "Slow Image Product",
      price: 12,
      quantity: 1,
      image: `https://res.cloudinary.com/${cloudName}/image/upload/v1/invoice-test/slow.jpg`,
      farmer: farmer._id,
    }]);
    const imageRequest = mockHostedImages({}, { timeout: true });
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const response = await downloadInvoice(timeoutOrder._id);
      expect(response.status).toBe(200);
      expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
      expect((response.body.toString("latin1").match(/\/Subtype \/Image/g) || []).length).toBe(3);
      expect(warning).toHaveBeenCalledWith(
        "Invoice product image unavailable",
        expect.stringContaining('"category":"timeout"')
      );
    } finally {
      imageRequest.mockRestore();
      warning.mockRestore();
    }
  });

  it.each([403, 404])("logs an HTTP %s image failure and still returns a PDF", async (statusCode) => {
    const cloudName = cloudinary.config().cloud_name || "test";
    const failedOrder = await createInvoiceOrder([{
      product: (await createInvoiceProduct(`HTTP ${statusCode} Product`))._id,
      name: `HTTP ${statusCode} Product`,
      price: 12,
      quantity: 1,
      image: `https://res.cloudinary.com/${cloudName}/image/upload/v1/invoice-test/http-${statusCode}.jpg`,
      farmer: farmer._id,
    }]);
    const imageRequest = mockHostedImages({
      [`http-${statusCode}.jpg`]: { statusCode, contentType: "text/plain" },
    });
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const response = await downloadInvoice(failedOrder._id);
      expect(response.status).toBe(200);
      expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
      expect(imageRequest).toHaveBeenCalledTimes(1);
      expect(warning.mock.calls[0][1]).toContain('"category":"http-error"');
      expect(warning.mock.calls[0][1]).toContain(`"httpStatus":${statusCode}`);
      expect(warning.mock.calls[0][1]).toContain(`"productId":"${failedOrder.items[0].product}"`);
    } finally {
      imageRequest.mockRestore();
      warning.mockRestore();
    }
  });

  it.each(["oversized", "invalid"])("uses a neutral fallback for %s hosted image data", async (failure) => {
    const cloudName = cloudinary.config().cloud_name || "test";
    const failedOrder = await createInvoiceOrder([{
      product: (await createInvoiceProduct(`${failure} Image Product`))._id,
      name: `${failure} Image Product`,
      price: 12,
      quantity: 1,
      image: `https://res.cloudinary.com/${cloudName}/image/upload/v1/invoice-test/${failure}.jpg`,
      farmer: farmer._id,
    }]);
    const imageRequest = mockHostedImages({
      [`${failure}.jpg`]: failure === "oversized"
        ? { contentType: "image/jpeg", contentLength: 4 * 1024 * 1024 + 1 }
        : { image: Buffer.from("not an image"), contentType: "image/jpeg" },
    });
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const response = await downloadInvoice(failedOrder._id);
      expect(response.status).toBe(200);
      expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
      expect(warning.mock.calls[0][1]).toContain(
        failure === "oversized" ? '"category":"image-too-large"' : '"category":"invalid-image-data"'
      );
    } finally {
      imageRequest.mockRestore();
      warning.mockRestore();
    }
  });

  it("embeds available images when another product image fails", async () => {
    const cloudName = cloudinary.config().cloud_name || "test";
    const goodImage = fs.readFileSync(path.resolve(__dirname, "../../client/public/images/products/apples.jpg"));
    const mixedOrder = await createInvoiceOrder([
      {
        product: (await createInvoiceProduct("Unavailable Product"))._id,
        name: "Unavailable Product",
        price: 12,
        quantity: 1,
        image: `https://res.cloudinary.com/${cloudName}/image/upload/v1/invoice-test/unavailable.jpg`,
        farmer: farmer._id,
      },
      {
        product: (await createInvoiceProduct("Available Product"))._id,
        name: "Available Product",
        price: 18,
        quantity: 1,
        image: `https://res.cloudinary.com/${cloudName}/image/upload/v1/invoice-test/available.jpg`,
        farmer: farmer._id,
      },
    ]);
    const imageRequest = mockHostedImages({
      "unavailable.jpg": { statusCode: 404 },
      "available.jpg": { image: goodImage, contentType: "image/jpeg" },
    });
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const response = await downloadInvoice(mixedOrder._id);
      expect(response.status).toBe(200);
      expect((response.body.toString("latin1").match(/\/Subtype \/Image/g) || []).length).toBe(4);
      expect(warning).toHaveBeenCalledTimes(1);
      expect(warning.mock.calls[0][1]).toContain('"productName":"Unavailable Product"');
    } finally {
      imageRequest.mockRestore();
      warning.mockRestore();
    }
  });

  it("generates a valid PDF without product images", async () => {
    const emptyOrder = await createInvoiceOrder([]);
    const response = await downloadInvoice(emptyOrder._id);
    expect(response.status).toBe(200);
    expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
    expect((response.body.toString("latin1").match(/\/Subtype \/Image/g) || []).length).toBe(3);
  });

  it("keeps all rows and the branded footer readable across multiple PDF pages", async () => {
    const longOrder = await Order.create({
      user: customer._id,
      orderNumber: "GM987654",
      invoiceNumber: "GM-INV-2026-987654",
      invoiceGeneratedAt: new Date(),
      items: Array.from({ length: 28 }, (_, index) => ({
        product: order.items[0].product,
        name: `Long-named organic product ${index + 1}`,
        price: 60,
        quantity: 2,
        farmer: farmer._id,
      })),
      address: {
        name: "Invoice Customer",
        line1: `${"Long saved address ".repeat(10)}12 Market Road`,
        city: "Gadag",
        postalCode: "582101",
        phone: "9998887777",
      },
      paymentMethod: "Cash on Delivery",
      subtotal: 3360,
      deliveryCharge: 30,
      total: 3390,
      status: "Order Placed",
    });

    const response = await request(app)
      .get(`/api/orders/${longOrder._id}/invoice/download`)
      .set("Authorization", `Bearer ${customerToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    const pdfText = getPdfText(response.body);
    const pageCount = (response.body.toString("latin1").match(/\/Type \/Page\b/g) || []).length;
    expect(response.status).toBe(200);
    expect(pageCount).toBeGreaterThan(1);
    expect(pdfText.match(/Thank you for shopping with/g)).toHaveLength(pageCount);
    expect(pdfText).toContain("Long-named organic product 28");
    expect(pdfText).toContain(longOrder.invoiceNumber);
  });
});

function createInvoiceOrder(items) {
  const suffix = `${String(Date.now()).slice(-4)}${String(++invoiceTestSequence).padStart(2, "0")}`;
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  return Order.create({
    user: customer._id,
    orderNumber: `GM${suffix}`,
    invoiceNumber: `GM-INV-${new Date().getFullYear()}-${suffix}`,
    invoiceGeneratedAt: new Date(),
    items,
    address: { name: "Invoice Customer", line1: "12 Market Road", city: "Gadag", postalCode: "582101" },
    paymentMethod: "Cash on Delivery",
    subtotal,
    deliveryCharge: 30,
    total: subtotal + 30,
    status: "Order Placed",
  });
}

function createInvoiceProduct(name, images = []) {
  return Product.create({
    name,
    description: "Test product image fixture",
    category: "Fruits",
    price: 18,
    stock: 5,
    images,
    farmer: farmer._id,
  });
}

function downloadInvoice(orderId) {
  return request(app)
    .get(`/api/orders/${orderId}/invoice/download`)
    .set("Authorization", `Bearer ${customerToken}`)
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
    });
}

function mockHostedImages(images, { timeout = false } = {}) {
  return jest.spyOn(https, "get").mockImplementation((url, _options, callback) => {
    const request = new EventEmitter();
    request.setTimeout = (_milliseconds, onTimeout) => {
      if (timeout) setImmediate(onTimeout);
      return request;
    };
    request.destroy = () => {
      const error = new Error("Image request timed out");
      error.code = "ETIMEDOUT";
      request.emit("error", error);
      return request;
    };

    if (!timeout) {
      setImmediate(() => {
        const keys = Object.keys(images);
        const key = keys.find((candidate) => candidate.endsWith("/") && url.pathname.includes(candidate))
          || keys.find((candidate) => url.pathname.endsWith(candidate));
        const configured = key ? images[key] : {};
        const result = Buffer.isBuffer(configured) ? { image: configured } : configured;
        const image = result.image;
        const statusCode = result.statusCode ?? (
          image || result.contentLength !== undefined || result.contentType ? 200 : 404
        );
        const response = Readable.from(image ? [image] : []);
        response.statusCode = statusCode;
        response.headers = {
          ...(result.headers || {}),
          ...(result.contentType ? { "content-type": result.contentType } : {}),
          ...(result.contentLength !== undefined
            ? { "content-length": String(result.contentLength) }
            : image
              ? { "content-length": String(image.length) }
              : {}),
        };
        callback(response);
      });
    }
    return request;
  });
}

function getPdfText(pdf) {
  const contents = [];
  const document = pdf.toString("latin1");
  const streams = /\/Length\s+(\d+)\s*\/Filter\s*\/FlateDecode\s*>>\s*stream\r?\n/g;
  let match;
  while ((match = streams.exec(document))) {
    const objectStart = document.lastIndexOf(" obj", match.index);
    const dictionary = document.slice(objectStart, match.index);
    if (dictionary.includes("/Subtype /Image")) continue;
    const length = Number(match[1]);
    const compressed = pdf.subarray(streams.lastIndex, streams.lastIndex + length);
    const content = zlib.inflateSync(compressed).toString("latin1");
    const decoded = content
      .replace(/\[([^\]]*)\]\s*TJ/g, (_, array) =>
        [...array.matchAll(/<([0-9a-f]+)>/gi)]
          .map(([, hex]) => Buffer.from(hex, "hex").toString("latin1"))
          .join("")
      )
      .replace(/<([0-9a-f]+)>/gi, (_, hex) => Buffer.from(hex, "hex").toString("latin1"));
    contents.push(decoded);
  }
  return contents.join("\n");
}
