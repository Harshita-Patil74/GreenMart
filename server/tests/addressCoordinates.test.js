const request = require("supertest");
const bcrypt = require("bcryptjs");
const { connectDB, disconnectDB } = require("./db");
const { app } = require("./setup");
const Address = require("../src/models/Address");
const User = require("../src/models/User");

const BASE = "/api/addresses";

describe("Address coordinates persistence", () => {
  let customerToken;
  let customerId;
  let otherCustomerToken;
  let otherCustomerId;

  beforeAll(async () => await connectDB());
  afterAll(async () => await disconnectDB());

  beforeEach(async () => {
    await Address.deleteMany({});
    await User.deleteMany({});

    const passwordHash = await bcrypt.hash("StrongPass1!", 10);
    const customer = await User.create({
      name: "Customer One",
      email: "customer1@example.test",
      passwordHash,
      role: "customer",
      status: "active",
    });
    customerId = customer._id;
    customerToken = "Bearer " + require("jsonwebtoken").sign(
      { id: customer._id, role: "customer" },
      require("../src/config/env").jwtSecret,
      { expiresIn: "1h" }
    );

    const otherCustomer = await User.create({
      name: "Customer Two",
      email: "customer2@example.test",
      passwordHash,
      role: "customer",
      status: "active",
    });
    otherCustomerId = otherCustomer._id;
    otherCustomerToken = "Bearer " + require("jsonwebtoken").sign(
      { id: otherCustomer._id, role: "customer" },
      require("../src/config/env").jwtSecret,
      { expiresIn: "1h" }
    );
  });

  it("creates an address with coordinates", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Authorization", customerToken)
      .send({
        name: "Home",
        line1: "123 Main Street",
        city: "Bangalore",
        phone: "555-0100",
        coordinates: { lat: 12.97, lng: 77.59 },
      });
    expect(res.status).toBe(201);
    expect(res.body.coordinates).toEqual({ lat: 12.97, lng: 77.59 });
  });

  it("retrieves coordinates via GET", async () => {
    const address = await Address.create({
      user: customerId,
      name: "Home",
      line1: "123 Main Street",
      city: "Bangalore",
      phone: "555-0100",
      coordinates: { lat: 12.97, lng: 77.59 },
    });

    const res = await request(app).get(BASE).set("Authorization", customerToken);
    expect(res.status).toBe(200);
    const saved = res.body.items.find((a) => a._id === address._id.toString());
    expect(saved.coordinates).toEqual({ lat: 12.97, lng: 77.59 });
  });

  it("updates an existing address with coordinates", async () => {
    const address = await Address.create({
      user: customerId,
      name: "Home",
      line1: "123 Main Street",
      city: "Bangalore",
      phone: "555-0100",
      coordinates: null,
    });

    const res = await request(app)
      .put(`${BASE}/${address._id}`)
      .set("Authorization", customerToken)
      .send({
        name: "Home",
        line1: "123 Main Street",
        city: "Bangalore",
        phone: "555-0100",
        coordinates: { lat: 12.97, lng: 77.59 },
      });
    expect(res.status).toBe(200);
    expect(res.body.coordinates).toEqual({ lat: 12.97, lng: 77.59 });

    // Verify persistence
    const saved = await Address.findById(address._id);
    expect(saved.coordinates).toEqual({ lat: 12.97, lng: 77.59 });
  });

  it("rejects invalid latitude", async () => {
    const address = await Address.create({
      user: customerId,
      name: "Home",
      line1: "123 Main Street",
      city: "Bangalore",
      phone: "555-0100",
      coordinates: null,
    });

    const res = await request(app)
      .put(`${BASE}/${address._id}`)
      .set("Authorization", customerToken)
      .send({
        name: "Home",
        line1: "123 Main Street",
        city: "Bangalore",
        phone: "555-0100",
        coordinates: { lat: 91, lng: 77.59 },
      });
    expect(res.status).toBe(400);
  });

  it("rejects invalid longitude", async () => {
    const address = await Address.create({
      user: customerId,
      name: "Home",
      line1: "123 Main Street",
      city: "Bangalore",
      phone: "555-0100",
      coordinates: null,
    });

    const res = await request(app)
      .put(`${BASE}/${address._id}`)
      .set("Authorization", customerToken)
      .send({
        name: "Home",
        line1: "123 Main Street",
        city: "Bangalore",
        phone: "555-0100",
        coordinates: { lat: 12.97, lng: 181 },
      });
    expect(res.status).toBe(400);
  });

  it("preserves existing address fields when updating coordinates", async () => {
    const address = await Address.create({
      user: customerId,
      name: "Home",
      line1: "123 Main Street",
      city: "Bangalore",
      phone: "555-0100",
      coordinates: null,
    });

    await request(app)
      .put(`${BASE}/${address._id}`)
      .set("Authorization", customerToken)
      .send({
        name: "Home",
        line1: "123 Main Street",
        city: "Bangalore",
        phone: "555-0100",
        coordinates: { lat: 12.97, lng: 77.59 },
      });

    const saved = await Address.findById(address._id);
    expect(saved.name).toBe("Home");
    expect(saved.line1).toBe("123 Main Street");
    expect(saved.city).toBe("Bangalore");
    expect(saved.phone).toBe("555-0100");
    expect(saved.coordinates).toEqual({ lat: 12.97, lng: 77.59 });
  });

  it("prevents another customer from updating the address", async () => {
    const address = await Address.create({
      user: customerId,
      name: "Home",
      line1: "123 Main Street",
      city: "Bangalore",
      phone: "555-0100",
      coordinates: null,
    });

    const res = await request(app)
      .put(`${BASE}/${address._id}`)
      .set("Authorization", otherCustomerToken)
      .send({
        name: "Home",
        line1: "123 Main Street",
        city: "Bangalore",
        phone: "555-0100",
        coordinates: { lat: 12.97, lng: 77.59 },
      });
    expect(res.status).toBe(404);
  });

  it("keeps coordinates null when not provided in update", async () => {
    const address = await Address.create({
      user: customerId,
      name: "Home",
      line1: "123 Main Street",
      city: "Bangalore",
      phone: "555-0100",
      coordinates: null,
    });

    const res = await request(app)
      .put(`${BASE}/${address._id}`)
      .set("Authorization", customerToken)
      .send({
        name: "Home Updated",
        line1: "456 New Street",
        city: "Mysore",
        phone: "555-0200",
      });
    expect(res.status).toBe(200);
    expect(res.body.coordinates).toBeNull();
  });
});
