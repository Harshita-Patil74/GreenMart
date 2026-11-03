const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");

describe("Farmer profile - phone, certificate, photo fixes", () => {
  let farmerToken, farmerId, adminToken, otherFarmerToken, otherFarmerId;

  beforeAll(async () => {
    await connectDB();

    // Create admin
    const admin = await User.create({
      name: "Admin Profile Test",
      email: "admin.profile@demo.greenmart.test",
      passwordHash: await bcrypt.hash("AdminPass1!", 10),
      role: "admin",
    });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.profile@demo.greenmart.test", password: "AdminPass1!" });
    adminToken = adminLogin.body.token;

    // Create farmer with phone and certificate details
    const farmer = await User.create({
      name: "Profile Farmer",
      email: "profile.farmer@demo.greenmart.test",
      passwordHash: await bcrypt.hash("FarmerPass1!", 10),
      role: "farmer",
      phone: "+91 9876543210",
      farmerApproved: true,
    });
    farmerId = farmer._id;

    await FarmerProfile.create({
      user: farmerId,
      farmName: "Existing Farm",
      farmAddress: "Existing Address",
      farmCategory: "Existing Category",
      description: "Existing description",
      photo: "https://res.cloudinary.com/test/image/upload/v1/existing.png",
      photoPublicId: "test/existing",
      certificateName: "Existing Cert",
      certificateNumber: "EXISTING-001",
      certification: { body: "Existing Cert", number: "EXISTING-001", verifiedByAdmin: true },
      verificationStatus: "Pending",
    });

    const farmerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "profile.farmer@demo.greenmart.test", password: "FarmerPass1!" });
    farmerToken = farmerLogin.body.token;

    // Create another farmer for ownership tests
    const otherFarmer = await User.create({
      name: "Other Profile Farmer",
      email: "other.profile.farmer@demo.greenmart.test",
      passwordHash: await bcrypt.hash("OtherPass1!", 10),
      role: "farmer",
    });
    otherFarmerId = otherFarmer._id;

    const otherFarmerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "other.profile.farmer@demo.greenmart.test", password: "OtherPass1!" });
    otherFarmerToken = otherFarmerLogin.body.token;
  });

  afterAll(async () => disconnectDB());

  describe("Certificate name and number", () => {
    it("farmer saves certificate name and number via updateProfile", async () => {
      const res = await request(app)
        .put("/api/farmers/profile")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send({
          certificateName: "Organic Farming Certificate",
          certificateNumber: "OFC2026KA5724",
        });
      expect(res.status).toBe(200);
      expect(res.body.certificateName).toBe("Organic Farming Certificate");
      expect(res.body.certificateNumber).toBe("OFC2026KA5724");
    });

    it("certificate name and number are preserved when other fields are updated", async () => {
      const res = await request(app)
        .put("/api/farmers/profile")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send({ farmName: "Updated Farm Name" });
      expect(res.status).toBe(200);
      expect(res.body.farmName).toBe("Updated Farm Name");
      expect(res.body.certificateName).toBe("Organic Farming Certificate");
      expect(res.body.certificateNumber).toBe("OFC2026KA5724");
    });
  });

  describe("Farm photo via Cloudinary", () => {
    it("farmer saves a farm photo through Cloudinary", async () => {
      const pngHeader = Buffer.from("89504e470d0a1a0a", "hex");
      const res = await request(app)
        .put("/api/farmers/me")
        .set("Authorization", `Bearer ${farmerToken}`)
        .field("farmName", "Photo Farm")
        .attach("photo", pngHeader, { filename: "new-photo.png", contentType: "image/png" });
      expect(res.status).toBe(200);
      expect(res.body.photo).toMatch(/^https:\/\/res\.cloudinary\.com\/test\/image\/upload\//);
      expect(res.body.photoPublicId).toBeDefined();
    });

    it("saved farm photo remains visible after profile reload", async () => {
      const profileRes = await request(app)
        .get("/api/farmers/profile")
        .set("Authorization", `Bearer ${farmerToken}`);
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.photo).toMatch(/^https:\/\/res\.cloudinary\.com\/test\/image\/upload\//);
    });

    it("existing photo remains when no replacement is uploaded", async () => {
      const before = await FarmerProfile.findOne({ user: farmerId });
      const existingPhoto = before.photo;

      const res = await request(app)
        .put("/api/farmers/me")
        .set("Authorization", `Bearer ${farmerToken}`)
        .field("farmName", "No Photo Change");
      expect(res.status).toBe(200);
      expect(res.body.photo).toBe(existingPhoto);
    });

    it("replacing a photo saves the new Cloudinary URL", async () => {
      const pngHeader = Buffer.from("89504e470d0a1a0a", "hex");
      const before = await FarmerProfile.findOne({ user: farmerId });
      const oldPhoto = before.photo;

      const res = await request(app)
        .put("/api/farmers/me")
        .set("Authorization", `Bearer ${farmerToken}`)
        .field("farmName", "Replace Photo")
        .attach("photo", pngHeader, { filename: "replace.png", contentType: "image/png" });
      expect(res.status).toBe(200);
      expect(res.body.photo).toMatch(/^https:\/\/res\.cloudinary\.com\/test\/image\/upload\//);
      expect(res.body.photo).not.toBe(oldPhoto);
    });
  });

  describe("Admin farmers API", () => {
    it("returns the farmer phone number", async () => {
      const res = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const farmer = res.body.find((f) => String(f.user._id) === String(farmerId));
      expect(farmer).toBeDefined();
      expect(farmer.user.phone).toBe("+91 9876543210");
    });

    it("returns certificate name and number", async () => {
      const res = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", `Bearer ${adminToken}`);
      const farmer = res.body.find((f) => String(f.user._id) === String(farmerId));
      expect(farmer.certificateName).toBe("Organic Farming Certificate");
      expect(farmer.certificateNumber).toBe("OFC2026KA5724");
    });

    it("returns the correct farm photo URL", async () => {
      const res = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", `Bearer ${adminToken}`);
      const farmer = res.body.find((f) => String(f.user._id) === String(farmerId));
      expect(farmer.photo).toMatch(/^https:\/\/res\.cloudinary\.com\/test\/image\/upload\//);
    });

    it("farmer and admin APIs return the same saved farm photo URL", async () => {
      const farmerRes = await request(app)
        .get("/api/farmers/profile")
        .set("Authorization", `Bearer ${farmerToken}`);
      const adminRes = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", `Bearer ${adminToken}`);
      const adminFarmer = adminRes.body.find((f) => String(f.user._id) === String(farmerId));
      expect(farmerRes.body.photo).toBe(adminFarmer.photo);
    });
  });

  describe("Ownership and authentication", () => {
    it("unauthenticated users cannot modify farmer profiles", async () => {
      const res = await request(app)
        .put("/api/farmers/profile")
        .send({ farmName: "Hacked" });
      expect(res.status).toBe(401);
    });

    it("one farmer cannot update another farmer's profile", async () => {
      const res = await request(app)
        .put("/api/farmers/profile")
        .set("Authorization", `Bearer ${otherFarmerToken}`)
        .send({ farmName: "Hacked Farm" });
      expect(res.status).toBe(200);
      // The other farmer's own profile was updated, not the target farmer's
      const targetProfile = await FarmerProfile.findOne({ user: farmerId });
      expect(targetProfile.farmName).not.toBe("Hacked Farm");
    });

    it("phone number is stored on User model and returned by admin API", async () => {
      const user = await User.findById(farmerId);
      expect(user.phone).toBe("+91 9876543210");

      const res = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", `Bearer ${adminToken}`);
      const farmer = res.body.find((f) => String(f.user._id) === String(farmerId));
      expect(farmer.user.phone).toBe("+91 9876543210");
    });
  });

  describe("Missing optional fields fallbacks", () => {
    it("shows appropriate values when optional fields are empty", async () => {
      const emptyFarmer = await User.create({
        name: "Empty Farmer",
        email: "empty.farmer@demo.greenmart.test",
        passwordHash: await bcrypt.hash("EmptyPass1!", 10),
        role: "farmer",
      });
      await FarmerProfile.create({
        user: emptyFarmer._id,
        farmName: "Empty Farm",
        verificationStatus: "Pending",
      });

      const res = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", `Bearer ${adminToken}`);
      const found = res.body.find((f) => String(f.user._id) === String(emptyFarmer._id));
      expect(found).toBeDefined();
      expect(found.certificateName).toBeUndefined();
      expect(found.certificateNumber).toBeUndefined();
      expect(found.photo).toBeUndefined();
      expect(found.user.phone).toBeUndefined();
    });
  });
});
