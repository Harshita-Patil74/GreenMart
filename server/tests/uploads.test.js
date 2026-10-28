const request = require("supertest");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const { signToken } = require("../src/utils/tokens");

const pngHeader = Buffer.from("89504e470d0a1a0a", "hex");
const uploadedPaths = [];
let customerToken;
let farmerToken;
let secondFarmerToken;
let pendingFarmerToken;
let customerId;
let farmerId;
let secondFarmerId;

beforeAll(async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash("ValidPass1!", 10);
  const [customer, farmer, pendingFarmer, secondFarmer] = await User.create([
    { name: "Upload Customer", email: "upload.customer@example.test", passwordHash, role: "customer" },
    { name: "Upload Farmer", email: "upload.farmer@example.test", passwordHash, role: "farmer" },
    { name: "Pending Farmer", email: "upload.pending@example.test", passwordHash, role: "farmer" },
    { name: "Second Upload Farmer", email: "upload.secondfarmer@example.test", passwordHash, role: "farmer" },
  ]);
  customerId = customer._id;
  farmerId = farmer._id;
  secondFarmerId = secondFarmer._id;
  await FarmerProfile.create([
    { user: farmer._id, farmName: "Upload Farm", certification: { verifiedByAdmin: true } },
    { user: pendingFarmer._id, farmName: "Pending Farm", certification: { verifiedByAdmin: false } },
    { user: secondFarmer._id, farmName: "Second Upload Farm", certification: { verifiedByAdmin: true } },
  ]);
  customerToken = signToken(customer);
  farmerToken = signToken(farmer);
  secondFarmerToken = signToken(secondFarmer);
  pendingFarmerToken = signToken(pendingFarmer);
});

afterAll(async () => {
  await disconnectDB();
  for (const filePath of uploadedPaths) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

function trackUpload(url) {
  uploadedPaths.push(path.join(__dirname, "..", "uploads", url.replace(/^\/uploads\//, "")));
}

describe("Authenticated profile image uploads", () => {
  it("rejects avatar uploads without authentication", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .attach("avatar", pngHeader, { filename: "avatar.png", contentType: "image/png" });

    expect(response.status).toBe(401);
  });

  it("stores a customer's avatar and serves it from the uploads endpoint", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .field("name", "Upload Customer")
      .attach("avatar", pngHeader, { filename: "avatar.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    expect(response.body.avatar).toMatch(/^\/uploads\/avatars\//);
    trackUpload(response.body.avatar);
    const storedUser = await User.findById(customerId);
    expect(storedUser.avatar).toBe(response.body.avatar);

    const profile = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(profile.body.avatar).toBe(response.body.avatar);

    const image = await request(app).get(response.body.avatar);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toMatch(/^image\/png/);
  });

  it("saves farmer profile photos to each farmer account independently", async () => {
    const firstResponse = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${farmerToken}`)
      .attach("avatar", pngHeader, { filename: "farmer-avatar.png", contentType: "image/png" });
    const secondResponse = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${secondFarmerToken}`)
      .attach("avatar", pngHeader, { filename: "second-farmer-avatar.png", contentType: "image/png" });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstResponse.body.avatar).not.toBe(secondResponse.body.avatar);
    expect(await User.findById(farmerId).then((user) => user.avatar)).toBe(firstResponse.body.avatar);
    expect(await User.findById(secondFarmerId).then((user) => user.avatar)).toBe(secondResponse.body.avatar);
    trackUpload(firstResponse.body.avatar);
    trackUpload(secondResponse.body.avatar);
  });

  it("preserves an existing avatar when no replacement file is supplied", async () => {
    const existingAvatar = (await User.findById(customerId)).avatar;
    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .field("name", "Customer Updated");

    expect(response.status).toBe(200);
    expect(response.body.avatar).toBe(existingAvatar);
  });

  it("does not allow a customer to change another user's avatar", async () => {
    const existingFarmerAvatar = await User.findById(farmerId).then((farmer) => farmer.avatar);
    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .field("user", String(farmerId))
      .attach("avatar", pngHeader, { filename: "avatar.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    expect(await User.findById(farmerId).then((farmer) => farmer.avatar)).toBe(existingFarmerAvatar);
    trackUpload(response.body.avatar);
  });

  it("rejects unsupported extensions and image data that does not match its declared type", async () => {
    const unsupported = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .attach("avatar", Buffer.from("<svg></svg>"), { filename: "avatar.svg", contentType: "image/svg+xml" });
    const invalidPng = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .attach("avatar", Buffer.from("not png"), { filename: "avatar.png", contentType: "image/png" });

    expect(unsupported.status).toBe(400);
    expect(invalidPng.status).toBe(400);
  });

  it("rejects profile images larger than the upload limit", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .attach("avatar", Buffer.alloc(5 * 1024 * 1024 + 1, 1), { filename: "large.png", contentType: "image/png" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("File too large");
  });

  it("allows an approved farmer to update only their farm photo", async () => {
    const response = await request(app)
      .put("/api/farmers/me")
      .set("Authorization", `Bearer ${farmerToken}`)
      .field("farmName", "Upload Farm")
      .attach("photo", pngHeader, { filename: "farm.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    expect(response.body.photo).toMatch(/^\/uploads\/farms\//);
    trackUpload(response.body.photo);
    const profile = await FarmerProfile.findOne({ user: farmerId });
    expect(profile.photo).toBe(response.body.photo);

    const retrievedProfile = await request(app).get(`/api/farmers/${farmerId}`);
    expect(retrievedProfile.body.photo).toBe(response.body.photo);
    expect((await request(app).get(response.body.photo)).status).toBe(200);

    const updateWithoutPhoto = await request(app)
      .put("/api/farmers/me")
      .set("Authorization", `Bearer ${farmerToken}`)
      .field("farmName", "Updated Upload Farm");
    expect(updateWithoutPhoto.body.photo).toBe(response.body.photo);
  });

  it("blocks customers, unapproved farmers, and unauthenticated users from farm uploads", async () => {
    const customerResponse = await request(app)
      .put("/api/farmers/me")
      .set("Authorization", `Bearer ${customerToken}`)
      .attach("photo", pngHeader, { filename: "farm.png", contentType: "image/png" });
    const pendingResponse = await request(app)
      .put("/api/farmers/me")
      .set("Authorization", `Bearer ${pendingFarmerToken}`)
      .attach("photo", pngHeader, { filename: "farm.png", contentType: "image/png" });
    const anonymousResponse = await request(app)
      .put("/api/farmers/me")
      .attach("photo", pngHeader, { filename: "farm.png", contentType: "image/png" });

    expect(customerResponse.status).toBe(403);
    expect(pendingResponse.status).toBe(403);
    expect(anonymousResponse.status).toBe(401);
  });
});
