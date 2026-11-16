// @ts-nocheck
// Routing is intercepted through global.fetch so the real deliveryService
// (including its lng,lat OSRM coordinate order) is exercised deterministically.
const distances = new Map();
const fetchMock = jest.fn(async (url) => {
  const m = String(url).match(/route\/v1\/driving\/([\d.-]+,[\d.-]+);([\d.-]+,[\d.-]+)/);
  if (!m) {
    return { ok: false, status: 400, json: async () => ({}) };
  }
  const origin = m[1].split(",").map(Number); // [longitude, latitude]
  const dest = m[2].split(",").map(Number);
  const key = `${origin[1]},${origin[0]}|${dest[1]},${dest[0]}`;
  const km = distances.get(key);
  if (km == null) {
    throw new Error(`No route mock for ${key}`);
  }
  return { ok: true, status: 200, json: async () => ({ routes: [{ distance: km * 1000 }] }) };
});
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = fetchMock;
});
afterAll(() => {
  global.fetch = originalFetch;
});

const request = require("supertest");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Address = require("../src/models/Address");
const Cart = require("../src/models/Cart");
const Order = require("../src/models/Order");
const Setting = require("../src/models/Setting");
const { clearDeliveryCache } = require("../src/services/deliveryService");

describe("Delivery quote recalculation when farmer changes dispatch location", () => {
  let customerToken;
  let farmer1Token;
  let farmer2Token;
  let customerId;
  let farmer1Id;
  let farmer2Id;
  let product1Id;
  let product2Id;
  let addressId;

  const CUSTOMER_COORDS = { lat: 15.43, lng: 75.64 };

  beforeAll(async () => await connectDB());
  afterAll(async () => await disconnectDB());

  beforeAll(async () => {
    const customer = await User.create({
      name: "Quote Customer",
      email: "quote.customer@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "customer",
    });
    const farmer1 = await User.create({
      name: "Farmer One",
      email: "farmer.one@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "farmer",
      farmerApproved: true,
    });
    const farmer2 = await User.create({
      name: "Farmer Two",
      email: "farmer.two@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "farmer",
      farmerApproved: true,
    });
    await FarmerProfile.create({
      user: farmer1._id,
      farmName: "Green Valley Farms",
      location: { lat: 12.97, lng: 77.59 },
      address: "Hosur Road, Bangalore",
      certification: { verifiedByAdmin: true },
    });
    await FarmerProfile.create({
      user: farmer2._id,
      farmName: "Hillside Farm",
      location: { lat: 13.08, lng: 80.27 },
      address: "Old Madras Road, Bangalore",
      certification: { verifiedByAdmin: true },
    });
    const p1 = await Product.create({
      name: "Organic Tomatoes",
      description: "Fresh organic tomatoes",
      category: "Vegetables",
      price: 40,
      unit: "kg",
      stock: 100,
      farmer: farmer1._id,
    });
    const p2 = await Product.create({
      name: "Carrots",
      description: "Fresh carrots",
      category: "Vegetables",
      price: 60,
      unit: "kg",
      stock: 100,
      farmer: farmer2._id,
    });
    const addr = await Address.create({
      user: customer._id,
      name: "Quote Customer",
      line1: "Market Road",
      city: "Gadag",
      phone: "555-0100",
      coordinates: CUSTOMER_COORDS,
    });
    await Setting.create({
      deliveryCharge: 30,
      expressDeliveryCharge: 60,
      remoteAreaDeliveryCharge: 120,
      maxRemoteDistanceKm: 50,
      expressMaxKm: 10,
      standardMaxKm: 5,
    });
    customerId = customer._id;
    farmer1Id = farmer1._id;
    farmer2Id = farmer2._id;
    product1Id = p1._id;
    product2Id = p2._id;
    addressId = addr._id;

    const login = (email) =>
      request(app).post("/api/auth/login").send({ email, password: "demo-password" });
    customerToken = (await login(customer.email)).body.token;
    farmer1Token = (await login(farmer1.email)).body.token;
    farmer2Token = (await login(farmer2.email)).body.token;
  });

  const setDistance = (oLat, oLng, dLat, dLng, km) => {
    distances.set(`${oLat},${oLng}|${dLat},${dLng}`, km);
  };

  const resetLocations = async () => {
    await FarmerProfile.findOneAndUpdate(
      { user: farmer1Id },
      { $set: { location: { lat: 12.97, lng: 77.59 }, address: "Hosur Road, Bangalore", locationVersion: 0 } },
    );
    await FarmerProfile.findOneAndUpdate(
      { user: farmer2Id },
      { $set: { location: { lat: 13.08, lng: 80.27 }, address: "Old Madras Road, Bangalore", locationVersion: 0 } },
    );
  };

  const addToCart = async (token, productId, quantity = 1) => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId, quantity });
    expect(res.status).toBe(200);
    return res;
  };

  const getQuote = async (token, body = {}) =>
    request(app).post("/api/orders/quote").set("Authorization", `Bearer ${token}`).send({ addressId, ...body });

  const placeOrder = async (token, quoteVersion, deliveryOption = "express") =>
    request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        addressId,
        deliveryOption,
        quoteVersion,
        paymentMethod: "cod",
        paymentConfirmed: true,
        address: { name: "Quote Customer", line1: "Market Road", city: "Gadag", phone: "555-0100" },
      });

  beforeEach(async () => {
    distances.clear();
    fetchMock.mockClear();
    setDistance(12.97, 77.59, 15.43, 75.64, 4.2);
    setDistance(18.92, 72.83, 15.43, 75.64, 6.8);
    setDistance(13.08, 80.27, 15.43, 75.64, 3.1);
    await resetLocations();
    await Cart.deleteMany({});
    await Order.deleteMany({});
  });

  it("calculates the initial quote from the farmer's dispatch coordinates", async () => {
    await addToCart(customerToken, product1Id, 2);
    const res = await getQuote(customerToken);
    expect(res.status).toBe(200);
    expect(res.body.subtotal).toBe(80);
    expect(res.body.distanceKm).toBe(4.2);
    expect(res.body.deliveryCharge).toBe(30);
    expect(res.body.total).toBe(110);
    expect(res.body.deliveryOption).toBe("standard");
    expect(res.body.shipments.length).toBe(1);
    expect(res.body.shipments[0].farmerId).toBe(farmer1Id.toString());
    expect(res.body.shipments[0].distanceKm).toBe(4.2);
    expect(res.body.shipments[0].locationVersion).toBe(0);
    expect(res.body.deliveryOptions.some((o) => o.option === "standard" && o.charge === 30)).toBe(true);
    expect(res.body.deliveryOptions.length).toBe(1);
    expect(typeof res.body.quoteVersion).toBe("string");
    expect(res.body.quoteVersion.length).toBeGreaterThan(0);
    // OSRM is called with longitude,latitude coordinate order.
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("77.59,12.97;75.64,15.43"))).toBe(true);
  });

  it("does not route when no delivery address is selected", async () => {
    await addToCart(customerToken, product1Id, 2);
    const res = await request(app)
      .post("/api/orders/quote")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.deliveryCharge).toBe(0);
    expect(res.body.total).toBe(80);
    expect(res.body.distanceKm).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("invalidates the old quote and recalculates from the updated coordinates", async () => {
    await addToCart(customerToken, product1Id, 2);
    const first = await getQuote(customerToken);
    const firstVersion = first.body.quoteVersion;

    const move = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmer1Token}`)
      .send({ lat: 18.92, lng: 72.83, address: "New Dispatch Road, Mumbai" });
    expect(move.status).toBe(200);
    expect(move.body.locationVersion).toBe(1);

    const profile = await FarmerProfile.findOne({ user: farmer1Id });
    expect(profile.location.lat).toBe(18.92);
    expect(profile.location.lng).toBe(72.83);

    const res = await getQuote(customerToken);
    expect(res.status).toBe(200);
    expect(res.body.distanceKm).toBe(6.8);
    expect(res.body.deliveryCharge).toBe(60);
    expect(res.body.total).toBe(140);
    expect(res.body.deliveryOption).toBe("express");
    expect(res.body.shipments[0].distanceKm).toBe(6.8);
    expect(res.body.shipments[0].locationVersion).toBe(1);
    expect(res.body.quoteVersion).not.toBe(firstVersion);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("72.83,18.92;75.64,15.43"))).toBe(true);
  });

  it("calculates each multi-farmer shipment from its own farmer's location", async () => {
    await addToCart(customerToken, product1Id, 1);
    await addToCart(customerToken, product2Id, 1);

    const res = await getQuote(customerToken);
    expect(res.status).toBe(200);
    expect(res.body.subtotal).toBe(100);
    expect(res.body.shipments.length).toBe(2);
    const byFarmer = {};
    for (const s of res.body.shipments) byFarmer[String(s.farmerId)] = s;
    expect(byFarmer[String(farmer1Id)].distanceKm).toBe(4.2);
    expect(byFarmer[String(farmer1Id)].locationVersion).toBe(0);
    expect(byFarmer[String(farmer2Id)].distanceKm).toBe(3.1);
    expect(byFarmer[String(farmer2Id)].locationVersion).toBe(0);
    expect(res.body.allServiceable).toBe(true);

    await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmer1Token}`)
      .send({ lat: 18.92, lng: 72.83, address: "New Dispatch Road, Mumbai" });

    const res2 = await getQuote(customerToken);
    const byFarmer2 = {};
    for (const s of res2.body.shipments) byFarmer2[String(s.farmerId)] = s;
    expect(byFarmer2[String(farmer1Id)].distanceKm).toBe(6.8);
    expect(byFarmer2[String(farmer1Id)].locationVersion).toBe(1);
    expect(byFarmer2[String(farmer2Id)].distanceKm).toBe(3.1);
    expect(byFarmer2[String(farmer2Id)].locationVersion).toBe(0);
  });

  it("rejects a stale quote at order creation", async () => {
    await addToCart(customerToken, product1Id, 2);
    const first = await getQuote(customerToken);

    await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmer1Token}`)
      .send({ lat: 18.92, lng: 72.83, address: "New Dispatch Road, Mumbai" });

    const res = await placeOrder(customerToken, first.body.quoteVersion);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/outdated/);
  });

  it("accepts the current quote and snapshots the recalculated distance and charge", async () => {
    await addToCart(customerToken, product1Id, 2);
    const first = await getQuote(customerToken);

    await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmer1Token}`)
      .send({ lat: 18.92, lng: 72.83, address: "New Dispatch Road, Mumbai" });

    const current = await getQuote(customerToken, { deliveryOption: "express" });
    expect(current.body.distanceKm).toBe(6.8);
    expect(current.body.deliveryCharge).toBe(60);
    expect(current.body.total).toBe(140);
    expect(current.body.deliveryOption).toBe("express");
    const res = await placeOrder(customerToken, current.body.quoteVersion, "express");
    expect(res.status).toBe(201);
    expect(res.body.deliveryCharge).toBe(60);
    expect(res.body.total).toBe(140);
    expect(res.body.deliverySnapshot.distanceKm).toBe(6.8);
    expect(res.body.deliverySnapshot.option).toBe("express");
    expect(res.body.deliverySnapshot.dispatchLocations[0].location).toEqual({ lat: 18.92, lng: 72.83 });
    expect(res.body.deliverySnapshot.settingsSnapshot.deliveryCharge).toBe(30);
  });

  it("preserves the historical order snapshot when the farmer moves again", async () => {
    await addToCart(customerToken, product1Id, 2);

    await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmer1Token}`)
      .send({ lat: 18.92, lng: 72.83, address: "New Dispatch Road, Mumbai" });

    const current = await getQuote(customerToken, { deliveryOption: "express" });
    expect(current.body.distanceKm).toBe(6.8);

    const res = await placeOrder(customerToken, current.body.quoteVersion, "express");
    expect(res.status).toBe(201);
    const orderId = res.body._id;

    await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmer1Token}`)
      .send({ lat: 19.07, lng: 72.87, address: "Third Dispatch Road, Mumbai" });

    const updatedProfile = await FarmerProfile.findOne({ user: farmer1Id });
    expect(updatedProfile.location.lat).toBe(19.07);

    const order = await Order.findById(orderId);
    expect(order.deliverySnapshot.distanceKm).toBe(6.8);
    expect(order.deliverySnapshot.charge).toBe(60);
    expect(order.deliverySnapshot.dispatchLocations[0].location).toEqual({ lat: 18.92, lng: 72.83 });
  });

  it("does not reuse a quote when routing fails after the farmer moves", async () => {
    await addToCart(customerToken, product1Id, 2);
    const first = await getQuote(customerToken);
    expect(first.body.allServiceable).toBe(true);

    await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmer1Token}`)
      .send({ lat: 20.0, lng: 70.0, address: "Unroutable Road, Nowhere" });

    const failed = await getQuote(customerToken);
    expect(failed.status).toBe(200);
    expect(failed.body.allServiceable).toBe(false);
    expect(failed.body.deliveryCharge).toBe(0);
    expect(failed.body.shipments[0].error).toMatch(/routing/i);

    const res = await placeOrder(customerToken, first.body.quoteVersion, "express");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/serviceable/);

    const blocked = await placeOrder(customerToken, failed.body.quoteVersion, "express");
    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toMatch(/serviceable/);
  });

  it("rejects invalid farmer coordinates and keeps the old quote intact", async () => {
    await addToCart(customerToken, product1Id, 2);
    const first = await getQuote(customerToken);
    expect(first.body.distanceKm).toBe(4.2);

    const bad = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmer1Token}`)
      .send({ lat: 200, lng: 77.59, address: "Somewhere" });
    expect(bad.status).toBe(400);

    const profile = await FarmerProfile.findOne({ user: farmer1Id });
    expect(profile.location.lat).toBe(12.97);

    const res = await getQuote(customerToken);
    expect(res.body.distanceKm).toBe(4.2);
    expect(res.body.quoteVersion).toBe(first.body.quoteVersion);
  });

  it("supports GeoJSON Point farmer coordinates stored in FarmerProfile", async () => {
    await addToCart(customerToken, product1Id, 2);
    await clearDeliveryCache();
    await FarmerProfile.findOneAndUpdate(
      { user: farmer1Id },
      { $set: { location: { type: "Point", coordinates: [77.59, 12.97] } } },
    );
    const res = await getQuote(customerToken);
    expect(res.status).toBe(200);
    expect(res.body.distanceKm).toBe(4.2);
    expect(res.body.allServiceable).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("77.59,12.97;75.64,15.43"))).toBe(true);
  });

  it("fails with a configuration error when delivery settings are missing", async () => {
    await addToCart(customerToken, product1Id, 2);
    await Setting.deleteMany({});
    const res = await getQuote(customerToken);
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("DELIVERY_CONFIG_INVALID");
    await Setting.create({
      deliveryCharge: 30,
      expressDeliveryCharge: 60,
      remoteAreaDeliveryCharge: 120,
      maxRemoteDistanceKm: 50,
      expressMaxKm: 10,
      standardMaxKm: 5,
    });
    const ok = await getQuote(customerToken);
    expect(ok.status).toBe(200);
  });

  it("fails with a configuration error when delivery settings are malformed", async () => {
    await addToCart(customerToken, product1Id, 2);
    await Setting.findOneAndUpdate({}, { $set: { expressDeliveryCharge: -10 } });
    const res = await getQuote(customerToken);
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("DELIVERY_CONFIG_INVALID");
    await Setting.findOneAndUpdate({}, { $set: { expressDeliveryCharge: 60 } });
    const ok = await getQuote(customerToken);
    expect(ok.status).toBe(200);
  });
});
