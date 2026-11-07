const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");

let farmerId;

beforeAll(async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash("ValidPass1!", 10);
  const farmer = await User.create({
    name: "Public Profile Farmer",
    email: "public.profile.farmer@example.test",
    passwordHash,
    role: "farmer",
    avatar: "https://example.test/farmer.png",
  });
  farmerId = farmer._id;
  await FarmerProfile.create({
    user: farmerId,
    farmName: "Public Farm",
    address: "Public farm address",
    category: "Vegetables",
    description: "Public farm description",
    photo: "https://example.test/farm.png",
    location: { lat: 15.4, lng: 75.6 },
    certification: {
      body: "Private certifying body",
      number: "PRIVATE-CERT-123",
      verifiedByAdmin: true,
      rejectionReason: "Private review note",
    },
    fullName: "Private Full Name",
    mobile: "9999999999",
    dateOfBirth: new Date("1980-01-01"),
    residentialAddress: "Private residential address",
    surveyNumber: "PRIVATE-SURVEY-456",
    landDescription: "Private land description",
    landPinCode: "123456",
  });
});

afterAll(async () => {
  await disconnectDB();
});

function expectPublicFarmerProfile(profile) {
  expect(profile).toMatchObject({
    farmName: "Public Farm",
    address: "Public farm address",
    user: {
      _id: String(farmerId),
      avatar: "https://example.test/farmer.png",
    },
  });
  expect(profile).not.toHaveProperty("mobile");
  expect(profile).not.toHaveProperty("dateOfBirth");
  expect(profile).not.toHaveProperty("residentialAddress");
  expect(profile).not.toHaveProperty("surveyNumber");
  expect(profile).not.toHaveProperty("landDescription");
  expect(profile).not.toHaveProperty("landPinCode");
  expect(profile.user).not.toHaveProperty("email");
  expect(profile.user).not.toHaveProperty("role");
  if (profile.certification) {
    expect(profile.certification).not.toHaveProperty("body");
    expect(profile.certification).not.toHaveProperty("number");
    expect(profile.certification).not.toHaveProperty("rejectionReason");
  }
}

describe("public farmer profile privacy", () => {
  it("returns public fields only from the farmer listing", async () => {
    const response = await request(app).get("/api/farmers");

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expectPublicFarmerProfile(response.body.items[0]);
    expect(response.body.items[0]).not.toHaveProperty("certification");
  });

  it("returns public fields only from a farmer profile detail", async () => {
    const response = await request(app).get(`/api/farmers/${farmerId}`);

    expect(response.status).toBe(200);
    expectPublicFarmerProfile(response.body);
    expect(response.body).toMatchObject({
      location: { lat: 15.4, lng: 75.6 },
      certification: { verifiedByAdmin: true },
    });
  });
});
