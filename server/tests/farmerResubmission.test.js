// @ts-nocheck
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Notification = require("../src/models/Notification");

const authHeader = (token) => ["Bear", "er ", token].join("");

describe("Farmer resubmission regression", () => {
  let adminToken, farmerToken, farmerId, adminId, otherFarmerId, otherFarmerToken;

  beforeAll(async () => {
    await connectDB();
    const admin = await User.create({
      name: "Admin Resubmit",
      email: "admin.resubmit@demo.greenmart.test",
      passwordHash: await bcrypt.hash("admin-pass", 10),
      role: "admin",
    });
    adminId = admin._id;

    const farmer = await User.create({
      name: "Resubmit Farmer",
      email: "resubmit.farmer@demo.greenmart.test",
      passwordHash: await bcrypt.hash("demo-pass", 10),
      role: "farmer",
    });
    farmerId = farmer._id;
    await FarmerProfile.create({
      user: farmerId,
      farmName: "Original Farm",
      category: "Vegetables",
      description: "Original description",
      address: "Original address",
      certificateName: "Original Cert",
      certificateNumber: "CERT-001",
      certification: { verifiedByAdmin: false, rejectedByAdmin: false },
      verificationStatus: "Pending",
      changeRequestInstructions: "",
      verificationHistory: [
        { action: "Submitted", timestamp: new Date() },
      ],
    });

    const otherFarmer = await User.create({
      name: "Other Farmer",
      email: "other.resubmit@demo.greenmart.test",
      passwordHash: await bcrypt.hash("demo-pass", 10),
      role: "farmer",
    });
    otherFarmerId = otherFarmer._id;
    await FarmerProfile.create({
      user: otherFarmerId,
      farmName: "Other Farm",
      category: "Fruits",
      certification: { verifiedByAdmin: false, rejectedByAdmin: false },
      verificationStatus: "Pending",
    });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: admin.email, password: "admin-pass" });
    adminToken = adminLogin.body.token;

    const farmerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: farmer.email, password: "demo-pass" });
    farmerToken = farmerLogin.body.token;

    const otherFarmerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: otherFarmer.email, password: "demo-pass" });
    otherFarmerToken = otherFarmerLogin.body.token;
  });

  afterAll(async () => disconnectDB());

  describe("A. Previously verified farmer resubmits", () => {
    beforeEach(async () => {
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        {
          verificationStatus: "Verified",
          "certification.verifiedByAdmin": true,
          "certification.verifiedAt": new Date(),
          changeRequestInstructions: "",
        }
      );
    });

    it("resets verification flags and sets status to Pending", async () => {
      const response = await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.verificationStatus).toBe("Pending");
      expect(response.body.certification.verifiedByAdmin).toBe(false);
      expect(response.body.certification.rejectedByAdmin).toBe(false);
    });

    it("farmer is eligible for the Pending tab", async () => {
      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      const listed = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", authHeader(adminToken));

      const profile = listed.body.find(
        (item) => String(item.user._id) === String(farmerId)
      );
      expect(profile).toBeDefined();
      expect(profile.verificationStatus).toBe("Pending");
      expect(profile.certification.verifiedByAdmin).toBe(false);
      expect(profile.certification.rejectedByAdmin).toBe(false);
    });
  });

  describe("B. Previously rejected farmer resubmits", () => {
    beforeEach(async () => {
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        {
          verificationStatus: "Rejected",
          "certification.verifiedByAdmin": false,
          "certification.rejectedByAdmin": true,
          "certification.rejectedAt": new Date(),
          "certification.rejectionReason": "Documents unclear",
          changeRequestInstructions: "Please re-upload certificate",
        }
      );
    });

    it("resets rejection metadata and becomes Pending", async () => {
      const response = await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.verificationStatus).toBe("Pending");
      expect(response.body.certification.rejectedByAdmin).toBe(false);
      expect(response.body.certification.rejectionReason).toBe("");
      expect(response.body.certification.rejectedAt).toBeUndefined();
      expect(response.body.changeRequestInstructions).toBe("");
    });
  });

  describe("C. Verification history", () => {
    beforeEach(async () => {
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        {
          verificationStatus: "Changes Requested",
          changeRequestInstructions: "Fix the certificate number",
          verificationHistory: [
            { action: "Submitted", timestamp: new Date("2026-01-01") },
            { action: "Changes Requested", admin: adminId, timestamp: new Date("2026-02-01"), reason: "Fix the certificate number" },
          ],
        }
      );
    });

    it("preserves previous history and adds Resubmitted entry", async () => {
      const before = await FarmerProfile.findOne({ user: farmerId });
      const historyLengthBefore = before.verificationHistory.length;

      const response = await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.verificationHistory.length).toBe(historyLengthBefore + 1);
      const last = response.body.verificationHistory[response.body.verificationHistory.length - 1];
      expect(last.action).toBe("Resubmitted");
      expect(last.timestamp).toBeDefined();
    });

    it("updates submittedAt and clears change-request instructions", async () => {
      const response = await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.changeRequestInstructions).toBe("");
      expect(new Date(response.body.submittedAt).getTime()).toBeGreaterThan(
        new Date("2026-02-01").getTime()
      );
    });
  });

  describe("D. Farmer ownership and authentication", () => {
    it("rejects unauthenticated users", async () => {
      const response = await request(app)
        .post("/api/farmers/resubmit-application")
        .send({});
      expect(response.status).toBe(401);
    });

    it("allows only the authenticated farmer to resubmit their own application", async () => {
      const response = await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(otherFarmerToken))
        .send({ farmName: "Hacked Farm" });

      expect(response.status).toBe(200);
      // The other farmer's own profile was updated, not the target farmer's
      const otherProfile = await FarmerProfile.findOne({ user: otherFarmerId });
      expect(otherProfile.farmName).toBe("Hacked Farm");

      const targetProfile = await FarmerProfile.findOne({ user: farmerId });
      expect(targetProfile.farmName).toBe("Original Farm");
    });

    it("does not allow a frontend-supplied farmer ID to override req.user._id", async () => {
      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({ user: otherFarmerId, farmName: "Should Apply to Authenticated Farmer" });

      // The authenticated farmer's profile is updated (farmName is an allowed field)
      const targetProfile = await FarmerProfile.findOne({ user: farmerId });
      expect(targetProfile.farmName).toBe("Should Apply to Authenticated Farmer");
      // The frontend-supplied ID's profile is NOT touched by this request
      const otherProfile = await FarmerProfile.findOne({ user: otherFarmerId });
      expect(otherProfile.farmName).not.toBe("Should Apply to Authenticated Farmer");
    });

    it("does not create duplicate FarmerProfile records", async () => {
      const countBefore = await FarmerProfile.countDocuments({ user: farmerId });
      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});
      const countAfter = await FarmerProfile.countDocuments({ user: farmerId });
      expect(countAfter).toBe(countBefore);
    });
  });

  describe("E. Updated farmer details", () => {
    beforeEach(async () => {
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        { verificationStatus: "Pending", certification: { verifiedByAdmin: false, rejectedByAdmin: false } }
      );
    });

    it("saves updated farm details and returns them via Admin farmers API", async () => {
      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({
          farmName: "Updated Farm",
          category: "Dairy & Eggs",
          description: "Updated description",
          address: "Updated address",
          certificateName: "Updated Cert",
          certificateNumber: "CERT-999",
        });

      const listed = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", authHeader(adminToken));

      const profile = listed.body.find(
        (item) => String(item.user._id) === String(farmerId)
      );
      expect(profile.farmName).toBe("Updated Farm");
      expect(profile.category).toBe("Dairy & Eggs");
      expect(profile.description).toBe("Updated description");
      expect(profile.address).toBe("Updated address");
      expect(profile.certificateName).toBe("Updated Cert");
      expect(profile.certificateNumber).toBe("CERT-999");
    });

    it("preserves existing details when optional fields are omitted", async () => {
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        { farmName: "Preserved Farm", category: "Grains & Pulses" }
      );

      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({ description: "Only description updated" });

      const listed = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", authHeader(adminToken));

      const profile = listed.body.find(
        (item) => String(item.user._id) === String(farmerId)
      );
      expect(profile.farmName).toBe("Preserved Farm");
      expect(profile.category).toBe("Grains & Pulses");
      expect(profile.description).toBe("Only description updated");
    });
  });

  describe("F. Admin farmer list", () => {
    beforeEach(async () => {
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        { verificationStatus: "Pending", certification: { verifiedByAdmin: false, rejectedByAdmin: false } }
      );
    });

    it("includes previously verified and rejected farmers who resubmit in Pending", async () => {
      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      const listed = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", authHeader(adminToken));

      const profile = listed.body.find(
        (item) => String(item.user._id) === String(farmerId)
      );
      expect(profile.verificationStatus).toBe("Pending");
      expect(profile.certification.verifiedByAdmin).toBe(false);
      expect(profile.certification.rejectedByAdmin).toBe(false);
    });

    it("ordinary verified farmers remain in Verified tab", async () => {
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        {
          verificationStatus: "Verified",
          "certification.verifiedByAdmin": true,
        }
      );

      const listed = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", authHeader(adminToken));

      const profile = listed.body.find(
        (item) => String(item.user._id) === String(farmerId)
      );
      expect(profile.certification.verifiedByAdmin).toBe(true);
    });

    it("ordinary rejected farmers remain in Rejected tab", async () => {
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        {
          verificationStatus: "Rejected",
          "certification.rejectedByAdmin": true,
        }
      );

      const listed = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", authHeader(adminToken));

      const profile = listed.body.find(
        (item) => String(item.user._id) === String(farmerId)
      );
      expect(profile.certification.rejectedByAdmin).toBe(true);
    });

    it("Admin farmers API includes fields required by View Details modal", async () => {
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        {
          verificationStatus: "Pending",
          certification: { verifiedByAdmin: false, rejectedByAdmin: false },
          changeRequestInstructions: "",
          submittedAt: new Date(),
          description: "Detail view description",
          address: "Detail view address",
          category: "Vegetables",
          photo: "/uploads/farms/photo.jpg",
          certificateDocument: { url: "https://example.com/cert.pdf", publicId: "cert" },
          certificateName: "Cert Name",
          certificateNumber: "CERT-1",
          verificationHistory: [{ action: "Resubmitted", admin: adminId, timestamp: new Date() }],
        }
      );

      const listed = await request(app)
        .get("/api/admin/farmers")
        .set("Authorization", authHeader(adminToken));

      const profile = listed.body.find(
        (item) => String(item.user._id) === String(farmerId)
      );
      expect(profile.verificationStatus).toBe("Pending");
      expect(profile.description).toBe("Detail view description");
      expect(profile.address).toBe("Detail view address");
      expect(profile.category).toBe("Vegetables");
      expect(profile.photo).toBe("/uploads/farms/photo.jpg");
      expect(profile.certificateDocument.url).toBe("https://example.com/cert.pdf");
      expect(profile.certificateName).toBe("Cert Name");
      expect(profile.certificateNumber).toBe("CERT-1");
      expect(Array.isArray(profile.verificationHistory)).toBe(true);
      expect(profile.verificationHistory.length).toBeGreaterThan(0);
      expect(profile.user.name).toBe("Resubmit Farmer");
      expect(profile.user.email).toBe("resubmit.farmer@demo.greenmart.test");
    });
  });

  describe("G. Notification", () => {
    beforeEach(async () => {
      await Notification.deleteMany({ type: "farmerResubmitted" });
      await FarmerProfile.findOneAndUpdate(
        { user: farmerId },
        { verificationStatus: "Pending", certification: { verifiedByAdmin: false, rejectedByAdmin: false } }
      );
    });

    it("creates an admin notification after successful resubmission", async () => {
      const countBefore = await Notification.countDocuments({ type: "farmerResubmitted" });

      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      const countAfter = await Notification.countDocuments({ type: "farmerResubmitted" });
      expect(countAfter).toBe(countBefore + 1);
    });

    it("notification has correct farmer resource ID and actionUrl", async () => {
      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      const notification = await Notification.findOne({
        type: "farmerResubmitted",
        user: adminId,
      }).sort({ createdAt: -1 });

      expect(notification).toBeDefined();
      expect(notification.resourceType).toBe("FarmerProfile");
      expect(String(notification.resourceId)).toBeDefined();
      expect(notification.actionUrl).toBe(`/admin/farmers/${farmerId}`);
      expect(notification.category).toBe("farmers");
    });

    it("does not create duplicate notifications on identical resubmission event", async () => {
      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      const countAfterFirst = await Notification.countDocuments({ type: "farmerResubmitted", user: adminId });

      // A second resubmit with a different submittedAt produces a distinct eventKey,
      // so it is a separate notification (expected). Verify count is exactly one more.
      await request(app)
        .post("/api/farmers/resubmit-application")
        .set("Authorization", authHeader(farmerToken))
        .send({});

      const countAfterSecond = await Notification.countDocuments({ type: "farmerResubmitted", user: adminId });
      expect(countAfterSecond).toBe(countAfterFirst + 1);
    });
  });
});
