// @ts-nocheck
const request = require("supertest");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");

describe("Farmer dispatch location", () => {
  let farmerToken;
  let farmerId;

  beforeAll(async () => await connectDB());
  afterAll(async () => await disconnectDB());

  beforeAll(async () => {
    const farmer = await User.create({
      name: "Dispatch Farmer",
      email: "dispatch.farmer@demo.greenmart.test",
      passwordHash: await require("bcryptjs").hash("demo-password", 10),
      role: "farmer",
      farmerApproved: true,
    });
    await FarmerProfile.create({
      user: farmer._id,
      farmName: "Dispatch Farm",
      certification: { verifiedByAdmin: true },
    });
    farmerId = farmer._id;
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: farmer.email, password: "demo-password" });
    farmerToken = res.body.token;
  });

  it("saves a new dispatch address with latitude and longitude", async () => {
    const res = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 12.97, lng: 77.59, address: "Hosur Road, Bangalore" });
    expect(res.status).toBe(200);
    expect(res.body.location.lat).toBe(12.97);
    expect(res.body.location.lng).toBe(77.59);
    expect(res.body.address).toBe("Hosur Road, Bangalore");
    expect(res.body.locationVersion).toBe(1);
  });

  it("updates only latitude and longitude and increments the location version", async () => {
    const res = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 13.08, lng: 80.27, address: "Hosur Road, Bangalore" });
    expect(res.status).toBe(200);
    expect(res.body.location.lat).toBe(13.08);
    expect(res.body.location.lng).toBe(80.27);
    expect(res.body.address).toBe("Hosur Road, Bangalore");
    expect(res.body.locationVersion).toBe(2);
  });

  it("rejects latitude outside -90 to 90", async () => {
    const res = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 91, lng: 77.59, address: "Hosur Road, Bangalore" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Latitude/);

    const res2 = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: -91, lng: 77.59, address: "Hosur Road, Bangalore" });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toMatch(/Latitude/);
  });

  it("rejects longitude outside -180 to 180", async () => {
    const res = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 12.97, lng: 181, address: "Hosur Road, Bangalore" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Longitude/);

    const res2 = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 12.97, lng: -181, address: "Hosur Road, Bangalore" });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toMatch(/Longitude/);
  });

  it("rejects missing or non-numeric coordinates", async () => {
    const res = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lng: 77.59, address: "Hosur Road, Bangalore" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Latitude/);

    const res2 = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 12.97, address: "Hosur Road, Bangalore" });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toMatch(/Longitude/);

    const res3 = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: "north", lng: 77.59, address: "Hosur Road, Bangalore" });
    expect(res3.status).toBe(400);
    expect(res3.body.message).toMatch(/Latitude/);
  });

  it("rejects a missing dispatch address", async () => {
    const res = await request(app)
      .put("/api/farmers/me/location")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ lat: 12.97, lng: 77.59 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/address/);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .put("/api/farmers/me/location")
      .send({ lat: 12.97, lng: 77.59, address: "Hosur Road, Bangalore" });
    expect(res.status).toBe(401);
  });

  it("persists the validated location in FarmerProfile", async () => {
    const profile = await FarmerProfile.findOne({ user: farmerId });
    expect(profile.location.lat).toBe(13.08);
    expect(profile.location.lng).toBe(80.27);
    expect(profile.address).toBe("Hosur Road, Bangalore");
    expect(profile.locationVersion).toBe(2);
  });
});
