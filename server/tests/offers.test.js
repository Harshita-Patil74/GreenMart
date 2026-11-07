const request = require("supertest");
const bcrypt = require("bcryptjs");
const { app } = require("./setup");
const { connectDB, disconnectDB } = require("./db");
const User = require("../src/models/User");
const FarmerProfile = require("../src/models/FarmerProfile");
const Product = require("../src/models/Product");
const Offer = require("../src/models/Offer");
const Order = require("../src/models/Order");
const Notification = require("../src/models/Notification");
const { getActiveOffers } = require("../src/services/offerService");

let farmerToken;
let otherFarmerToken;
let customerToken;
let adminToken;
let farmerId;
let productId;
let otherProductId;
let offerId;
let orderId;

const dates = {
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

beforeAll(async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash("ValidPass1!", 10);
  const [farmer, otherFarmer, customer, admin] = await Promise.all([
    User.create({ name: "Offer Farmer", email: "offers.farmer@example.test", passwordHash, role: "farmer" }),
    User.create({ name: "Other Offer Farmer", email: "offers.other@example.test", passwordHash, role: "farmer" }),
    User.create({ name: "Offer Customer", email: "offers.customer@example.test", passwordHash, role: "customer" }),
    User.create({ name: "Offer Admin", email: "offers.admin@example.test", passwordHash, role: "admin" }),
  ]);
  farmerId = farmer._id;
  otherFarmerId = otherFarmer._id;
  await FarmerProfile.create([
    { user: farmer._id, farmName: "Offer Farm", certification: { verifiedByAdmin: true } },
    { user: otherFarmer._id, farmName: "Other Offer Farm", certification: { verifiedByAdmin: true } },
  ]);
  const [product, otherProduct] = await Promise.all([
    Product.create({
      name: "Organic Fig", description: "Fresh organic figs", category: "Fruits",
      price: 100, unit: "kg", stock: 100, farmer: farmer._id, images: ["https://images.example.test/fig.jpg"],
    }),
    Product.create({
      name: "Other Farmer Fig", description: "Fresh figs", category: "Fruits",
      price: 100, unit: "kg", stock: 100, farmer: otherFarmer._id,
    }),
  ]);
  productId = product._id;
  otherProductId = otherProduct._id;
  const [farmerLogin, otherFarmerLogin, customerLogin, adminLogin] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: farmer.email, password: "ValidPass1!" }),
    request(app).post("/api/auth/login").send({ email: otherFarmer.email, password: "ValidPass1!" }),
    request(app).post("/api/auth/login").send({ email: customer.email, password: "ValidPass1!" }),
    request(app).post("/api/auth/login").send({ email: admin.email, password: "ValidPass1!" }),
  ]);
  farmerToken = farmerLogin.body.token;
  otherFarmerToken = otherFarmerLogin.body.token;
  customerToken = customerLogin.body.token;
  adminToken = adminLogin.body.token;
});

afterAll(async () => {
  await disconnectDB();
});

const offerDraft = (overrides = {}) => ({
  title: "Fig harvest offer",
  description: "Save on fresh figs from our farm.",
  product: String(productId),
  type: "Seasonal Offer",
  discountType: "Percentage",
  discountValue: 10,
  ...dates,
  minimumQuantity: 1,
  minimumAmount: 200,
  maximumDiscount: 20,
  ...overrides,
});

describe("Farmer offers and server-priced order snapshots", () => {
  it("returns only the authenticated farmer's active, stocked, priced eligible products", async () => {
    const unavailableProducts = await Product.create([
      {
        name: "Out of Stock Product", description: "Not offer eligible", category: "Fruits",
        price: 20, unit: "kg", stock: 0, farmer: farmerId,
      },
      {
        name: "Unapproved Product", description: "Not offer eligible", category: "Fruits",
        price: 20, unit: "kg", stock: 10, farmer: farmerId, status: "Pending",
      },
      {
        name: "Unpriced Product", description: "Not offer eligible", category: "Fruits",
        price: 0, unit: "kg", stock: 10, farmer: farmerId,
      },
    ]);
    try {
      const [own, other] = await Promise.all([
        request(app).get("/api/farmers/offers/eligible-products").set("Authorization", "Bearer " + farmerToken),
        request(app).get("/api/farmers/offers/eligible-products").set("Authorization", "Bearer " + otherFarmerToken),
      ]);
      expect(own.status).toBe(200);
      expect(own.body.map((product) => product._id)).toContain(String(productId));
      expect(own.body.map((product) => product._id)).not.toContain(String(otherProductId));
      expect(own.body.map((product) => product.name)).not.toEqual(expect.arrayContaining([
        "Out of Stock Product", "Unapproved Product", "Unpriced Product",
      ]));
      expect(other.status).toBe(200);
      expect(other.body.map((product) => product._id)).toContain(String(otherProductId));
      expect(other.body.map((product) => product._id)).not.toContain(String(productId));
    } finally {
      await Product.deleteMany({ _id: { $in: unavailableProducts.map((product) => product._id) } });
    }
  });

  it("restricts the management API to authenticated administrators", async () => {
    const [guest, customer, farmer, admin] = await Promise.all([
      request(app).get("/api/admin/offers"),
      request(app).get("/api/admin/offers").set("Authorization", `Bearer ${customerToken}`),
      request(app).get("/api/admin/offers").set("Authorization", `Bearer ${farmerToken}`),
      request(app).get("/api/admin/offers").set("Authorization", `Bearer ${adminToken}`),
    ]);

    expect(guest.status).toBe(401);
    expect(customer.status).toBe(403);
    expect(farmer.status).toBe(403);
    expect(admin.status).toBe(200);
  });

  it("restricts filter options to admins and returns offer-related farmer and product records", async () => {
    const [guest, customer, farmer, admin] = await Promise.all([
      request(app).get("/api/admin/offers/options"),
      request(app).get("/api/admin/offers/options").set("Authorization", "Bearer " + customerToken),
      request(app).get("/api/admin/offers/options").set("Authorization", "Bearer " + farmerToken),
      request(app).get("/api/admin/offers/options").set("Authorization", "Bearer " + adminToken),
    ]);

    expect(guest.status).toBe(401);
    expect(customer.status).toBe(403);
    expect(farmer.status).toBe(403);
    expect(admin.status).toBe(200);
    expect(admin.body).toMatchObject({ farmers: [], products: [] });
  });

  it("requires farmer authentication and derives farmer ownership from the token", async () => {
    const guest = await request(app).post("/api/farmers/offers").send(offerDraft());
    const customer = await request(app)
      .post("/api/farmers/offers")
      .set("Authorization", `Bearer ${customerToken}`)
      .send(offerDraft());

    expect(guest.status).toBe(401);
    expect(customer.status).toBe(403);

    const created = await request(app)
      .post("/api/farmers/offers")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ ...offerDraft(), farmer: String(otherProductId), status: "Active", approvedBy: "forged" });

    expect(created.status).toBe(201);
    expect(created.body.status).toBe("Pending");
    expect(String(created.body.farmer)).toBe(String(farmerId));
    offerId = created.body._id;
    const adminNotification = await Notification.findOne({
      resourceId: offerId,
      type: "newOfferAdmin",
    });
    expect(adminNotification).toMatchObject({
      category: "offers",
      title: "Offer submitted for review",
    });
    const adminNotifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", "Bearer " + adminToken);
    expect(adminNotifications.body.some((notification) => notification._id === String(adminNotification._id))).toBe(true);
    const farmerNotifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", "Bearer " + farmerToken);
    expect(farmerNotifications.body.some((notification) => notification._id === String(adminNotification._id))).toBe(false);
    const customerNotifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", "Bearer " + customerToken);
    expect(customerNotifications.body.some((notification) => notification._id === String(adminNotification._id))).toBe(false);

    const customerRead = await request(app)
      .get(`/api/farmers/offers/${offerId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(customerRead.status).toBe(403);
  });

  it("rejects products owned by another farmer and invalid discounts or dates", async () => {
    const foreignProduct = await request(app)
      .post("/api/farmers/offers")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send(offerDraft({ product: String(otherProductId) }));
    const excessiveFixedDiscount = await request(app)
      .post("/api/farmers/offers")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send(offerDraft({ discountType: "Fixed Amount", discountValue: 100 }));
    const reversedDates = await request(app)
      .post("/api/farmers/offers")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send(offerDraft({ endDate: dates.startDate }));

    expect(foreignProduct.status).toBe(400);
    expect(excessiveFixedDiscount.status).toBe(400);
    expect(reversedDates.status).toBe(400);
  });

  it("prevents cross-farmer edits and farmer-side approval", async () => {
    const options = await request(app)
      .get("/api/admin/offers/options")
      .set("Authorization", "Bearer " + adminToken);
    const foreignRead = await request(app)
      .get(`/api/farmers/offers/${offerId}`)
      .set("Authorization", `Bearer ${otherFarmerToken}`);
    const foreignEdit = await request(app)
      .patch(`/api/farmers/offers/${offerId}`)
      .set("Authorization", `Bearer ${otherFarmerToken}`)
      .send(offerDraft({ title: "Not mine" }));
    const farmerApproval = await request(app)
      .patch(`/api/admin/offers/${offerId}/approve`)
      .set("Authorization", `Bearer ${farmerToken}`);

    expect(foreignRead.status).toBe(404);
    expect(foreignEdit.status).toBe(404);
    expect(farmerApproval.status).toBe(403);
    expect(options.body.farmers.some((farmerRecord) => farmerRecord._id === String(farmerId))).toBe(true);
    expect(options.body.products.some((product) => product._id === String(productId))).toBe(true);
  });

  it("keeps unapproved offers out of the public customer offers feed", async () => {
    const response = await request(app).get("/api/products/storefront/offers");
    expect(response.status).toBe(200);
    expect(response.body.items.some((offer) => offer._id === String(offerId))).toBe(false);
  });

  it("filters and sorts storefront products using only eligible active offers", async () => {
    const admin = await User.findOne({ role: "admin" });
    const approvedOffers = await Offer.create([
      {
        ...offerDraft({ title: "Featured fig discount", discountValue: 15, minimumAmount: 0 }),
        farmer: farmerId,
        status: "Active",
        approvedAt: new Date(),
        approvedBy: admin._id,
      },
      {
        ...offerDraft({
          title: "Featured other fig discount",
          product: String(otherProductId),
          discountValue: 30,
          minimumAmount: 0,
        }),
        farmer: (await Product.findById(otherProductId)).farmer,
        status: "Active",
        approvedAt: new Date(),
        approvedBy: admin._id,
      },
    ]);

    try {
      const [offersOnly, sorted] = await Promise.all([
        request(app).get("/api/products/storefront").query({ hasOffer: "true", limit: 50 }),
        request(app).get("/api/products/storefront").query({ sort: "discount_desc", hasOffer: "true", limit: 50 }),
      ]);
      expect(offersOnly.status).toBe(200);
      expect(offersOnly.body.items.map((product) => product._id)).toEqual(expect.arrayContaining([
        String(productId),
        String(otherProductId),
      ]));
      expect(sorted.status).toBe(200);
      expect(sorted.body.items[0]._id).toBe(String(otherProductId));
      expect(sorted.body.items.every((product) => product.offer)).toBe(true);
      expect(sorted.body.items.find((product) => product._id === String(productId)).offer).toMatchObject({
        title: "Featured fig discount",
        offerPrice: 85,
        discountPercent: 15,
        totalSavings: 15,
      });
    } finally {
      await Offer.deleteMany({ _id: { $in: approvedOffers.map((offer) => offer._id) } });
    }
  });

  it("applies combined offer filters and returns backend-calculated prices", async () => {
    const response = await request(app)
      .get("/api/admin/offers")
      .set("Authorization", "Bearer " + adminToken)
      .query({
        farmerId: String(farmerId),
        productId: String(productId),
        type: "Seasonal Offer",
        status: "Pending",
        search: "Organic Fig",
        page: 1,
        limit: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 1, page: 1, pages: 1 });
    expect(response.body.items[0]).toMatchObject({
      _id: String(offerId),
      status: "Pending",
      approvalStatus: "Pending",
      effectiveStatus: "Pending",
      originalPrice: 100,
      discountAmount: 10,
      offerPrice: 90,
      product: { name: "Organic Fig" },
      farmer: { name: "Offer Farmer" },
    });
  });

  it("returns only offers matching each effective status in admin filters", async () => {
    const admin = await User.findOne({ role: "admin" });
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filterLabel = `status-filter-${Date.now()}`;
    const records = await Offer.create([
      { ...offerDraft({ title: `${filterLabel}-pending` }), farmer: farmerId },
      {
        ...offerDraft({ title: `${filterLabel}-active` }),
        farmer: farmerId, status: "Active", approvedAt: new Date(), approvedBy: admin._id,
      },
      {
        ...offerDraft({ title: `${filterLabel}-scheduled`, startDate: futureStart.toISOString() }),
        farmer: farmerId, status: "Active", approvedAt: new Date(), approvedBy: admin._id,
      },
      {
        ...offerDraft({
          title: `${filterLabel}-expired`,
          startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: pastEnd.toISOString(),
        }),
        farmer: farmerId, status: "Active", approvedAt: new Date(), approvedBy: admin._id,
      },
      {
        ...offerDraft({ title: `${filterLabel}-inactive` }),
        farmer: farmerId, status: "Inactive", isActive: false,
      },
      {
        ...offerDraft({ title: `${filterLabel}-rejected` }),
        farmer: farmerId, status: "Rejected", isActive: false,
      },
    ]);

    try {
      const expectedTitles = {
        Pending: `${filterLabel}-pending`,
        Active: `${filterLabel}-active`,
        Scheduled: `${filterLabel}-scheduled`,
        Expired: `${filterLabel}-expired`,
        Inactive: `${filterLabel}-inactive`,
        Rejected: `${filterLabel}-rejected`,
      };
      for (const [status, title] of Object.entries(expectedTitles)) {
        const response = await request(app)
          .get("/api/admin/offers")
          .set("Authorization", "Bearer " + adminToken)
          .query({ status, search: filterLabel, limit: 50 });
        expect(response.status).toBe(200);
        expect(response.body.items.map((row) => row.title)).toEqual([title]);
        expect(response.body.items[0].effectiveStatus).toBe(status);
      }
    } finally {
      await Offer.deleteMany({ _id: { $in: records.map((record) => record._id) } });
    }
  });

  it("returns approved scheduled offers for customers to filter by status", async () => {
    const admin = await User.findOne({ role: "admin" });
    const scheduledOffer = await Offer.create({
      ...offerDraft({
        title: "Future Fig Offer",
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      farmer: farmerId,
      status: "Active",
      approvedAt: new Date(),
      approvedBy: admin._id,
    });

    try {
      const response = await request(app).get("/api/products/storefront/offers");
      const returnedOffer = response.body.items.find((offer) => offer._id === String(scheduledOffer._id));
      expect(response.status).toBe(200);
      expect(returnedOffer.effectiveStatus).toBe("Scheduled");
    } finally {
      await Offer.findByIdAndDelete(scheduledOffer._id);
    }
  });

  it("approves future offers without making them purchasable before their start date", async () => {
    const futureOffer = await request(app)
      .post("/api/farmers/offers")
      .set("Authorization", "Bearer " + farmerToken)
      .send(offerDraft({
        title: "Future approval offer",
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }));
    const approval = await request(app)
      .patch(`/api/admin/offers/${futureOffer.body._id}/approve`)
      .set("Authorization", "Bearer " + adminToken);

    try {
      expect(futureOffer.status).toBe(201);
      expect(approval.status).toBe(200);
      expect(approval.body.approvalStatus).toBe("Active");
      expect(approval.body.effectiveStatus).toBe("Scheduled");
      expect((await getActiveOffers([productId])).some((entry) => String(entry._id) === futureOffer.body._id)).toBe(false);
    } finally {
      if (futureOffer.body?._id) await Offer.findByIdAndDelete(futureOffer.body._id);
    }
  });

  it("does not approve offers for blocked farmer accounts", async () => {
    await User.findByIdAndUpdate(farmerId, { status: "blocked" });
    const approval = await request(app)
      .patch(`/api/admin/offers/${offerId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    await User.findByIdAndUpdate(farmerId, { status: "active" });

    expect(approval.status).toBe(409);
    expect((await Offer.findById(offerId)).status).toBe("Pending");
  });

  it("allows only an admin to approve, then applies the capped discount to real checkout totals", async () => {
    const approval = await request(app)
      .patch(`/api/admin/offers/${offerId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(approval.status).toBe(200);
    expect(approval.body.effectiveStatus).toBe("Active");
    const approvedOffer = await Offer.findById(offerId);
    expect(String(approvedOffer.approvedBy)).toBe(String((await User.findOne({ role: "admin" }))._id));
    expect(approvedOffer.approvedAt).toBeInstanceOf(Date);
    expect(approval.body.approvalStatus).toBe("Active");
    const approvalNotification = await Notification.findOne({
      user: farmerId,
      resourceId: offerId,
      type: "offerApproved",
    });
    expect(approvalNotification).toMatchObject({ category: "offers", title: "Offer approved" });
    expect(await Notification.countDocuments({
      user: farmerId,
      resourceId: offerId,
      type: "offerApproved",
    })).toBe(1);
    await Offer.create({
      ...offerDraft({ title: "Smaller competing offer", discountValue: 5, maximumDiscount: null }),
      farmer: farmerId,
      status: "Active",
      approvedAt: new Date(),
      approvedBy: (await User.findOne({ role: "admin" }))._id,
    });

    const storefront = await request(app).get("/api/products/storefront");
    const promotedProduct = storefront.body.items.find((product) => String(product._id) === String(productId));
    expect(promotedProduct.offer.title).toBe("Fig harvest offer");
    const customerOffers = await request(app).get("/api/products/storefront/offers");
    const customerOffer = customerOffers.body.items.find((offer) => offer._id === String(offerId));
    expect(customerOffer).toMatchObject({
      effectiveStatus: "Active",
      originalPrice: 100,
      offerPrice: 90,
      discountPercent: 10,
      product: { name: "Organic Fig", stock: 100 },
      farmer: { name: "Offer Farmer" },
    });

    const cart = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId: String(productId), quantity: 1 });
    expect(cart.status).toBe(200);
    expect(cart.body.items[0].offer).toBeNull();
    await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId: String(otherProductId), quantity: 1 });
    const cartWithMinimumOrder = await request(app)
      .get("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(cartWithMinimumOrder.body.items.find((item) => String(item.product._id) === String(productId)).offer.appliedDiscount).toBe(10);
    await request(app)
      .delete(`/api/cart/items/${otherProductId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    const qualifiedCart = await request(app)
      .put(`/api/cart/items/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ quantity: 3 });
    expect(qualifiedCart.body.items[0].offer.appliedDiscount).toBe(20);

    const order = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        address: { name: "Offer Customer", line1: "1 Market Road", city: "Gadag", phone: "555-0101" },
        paymentMethod: "Cash on Delivery",
      });
    expect(order.status).toBe(201);
    expect(order.body.subtotal).toBe(300);
    expect(order.body.discount).toBe(20);
    expect(order.body.total).toBe(310);
    expect(order.body.items[0].price).toBe(100);
    expect(order.body.items[0].offerSnapshot.offerTitle).toBe("Fig harvest offer");
    expect(order.body.items[0].offerSnapshot.appliedDiscount).toBe(20);
    expect(order.body.items[0].offerSnapshot.finalLineTotal).toBe(280);
    orderId = order.body._id;

    const farmerOrders = await request(app)
      .get("/api/orders/farmer")
      .set("Authorization", `Bearer ${farmerToken}`);
    expect(farmerOrders.body.items.find((item) => item._id === orderId).total).toBe(280);
    const salesOverview = await request(app)
      .get("/api/farmers/sales/overview")
      .set("Authorization", `Bearer ${farmerToken}`);
    expect(salesOverview.body.totalRevenue).toBe(280);
  });

  it("counts offer sales only from delivered offer snapshots and preserves them after offer edits", async () => {
    for (const status of ["Packed", "Out for Delivery", "Delivered"]) {
      const updated = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${farmerToken}`)
        .send({ status });
      expect(updated.status).toBe(200);
    }

    const deliveredOrder = await Order.findById(orderId);
    await Order.create({
      orderNumber: `GM-OFFER-CANCEL-${Date.now()}`,
      user: deliveredOrder.user,
      items: [{
        ...deliveredOrder.items[0].toObject(),
        fulfillmentStatus: "Cancelled",
      }],
      status: "Cancelled",
      subtotal: deliveredOrder.subtotal,
      discount: deliveredOrder.discount,
      deliveryCharge: deliveredOrder.deliveryCharge,
      total: deliveredOrder.total,
    });

    const stats = await request(app)
      .get("/api/farmers/offers/stats")
      .set("Authorization", `Bearer ${farmerToken}`);
    expect(stats.status).toBe(200);
    expect(stats.body.totalOffers).toBe(2);
    expect(stats.body.totalSales).toBe(280);

    const before = await Order.findById(orderId);
    const edited = await request(app)
      .patch(`/api/farmers/offers/${offerId}`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send(offerDraft({ title: "Updated fig offer", discountValue: 15 }));
    const after = await Order.findById(orderId);
    expect(edited.status).toBe(200);
    expect(edited.body.status).toBe("Pending");
    expect(edited.body.statusHistory).toHaveLength(3);
    expect(after.items[0].offerSnapshot.offerTitle).toBe(before.items[0].offerSnapshot.offerTitle);
    expect(after.items[0].price).toBe(before.items[0].price);
    expect(after.total).toBe(before.total);
  });

  it("allows administrators to reject offers with a saved reason", async () => {
    const created = await request(app)
      .post("/api/farmers/offers")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send(offerDraft({ title: "Needs review offer" }));
    const rejected = await request(app)
      .patch(`/api/admin/offers/${created.body._id}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Please clarify the promotion terms." });
    const missingReason = await request(app)
      .patch(`/api/admin/offers/${created.body._id}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(rejected.status).toBe(200);
    expect(rejected.body.effectiveStatus).toBe("Rejected");
    expect(rejected.body.rejectionReason).toBe("Please clarify the promotion terms.");
    const savedRejection = await Offer.findById(created.body._id);
    expect(savedRejection.rejectedBy.toString()).toBe((await User.findOne({ role: "admin" }))._id.toString());
    expect(savedRejection.rejectedAt).toBeInstanceOf(Date);
    const rejectionNotification = await Notification.findOne({
      user: farmerId,
      resourceId: created.body._id,
      type: "offerRejected",
    });
    expect(rejectionNotification).toMatchObject({
      category: "offers",
      title: "Offer was not approved",
      message: expect.stringContaining("Please clarify the promotion terms."),
    });
    expect(await Notification.countDocuments({
      user: farmerId,
      resourceId: created.body._id,
      type: "offerRejected",
    })).toBe(1);
    expect(missingReason.status).toBe(400);
  });

  it("allows admins to deactivate active offers and does not duplicate farmer notifications", async () => {
    const activeOffer = await Offer.create({
      ...offerDraft({ title: "Admin deactivation test" }),
      farmer: farmerId,
      status: "Active",
      approvedAt: new Date(),
      approvedBy: (await User.findOne({ role: "admin" }))._id,
    });
    const endpoint = `/api/admin/offers/${activeOffer._id}/deactivate`;
    const [deactivated, repeated] = await Promise.all([
      request(app).patch(endpoint).set("Authorization", "Bearer " + adminToken),
      request(app).patch(endpoint).set("Authorization", "Bearer " + adminToken),
    ]);

    expect([deactivated.status, repeated.status].sort()).toEqual([200, 409]);
    expect((await Offer.findById(activeOffer._id)).status).toBe("Inactive");
    expect(await Notification.countDocuments({
      user: farmerId,
      resourceId: activeOffer._id,
      type: "offerDeactivated",
    })).toBe(1);
    expect(await Notification.findOne({
      user: farmerId,
      resourceId: activeOffer._id,
      type: "offerDeactivated",
    })).toMatchObject({ category: "offers", title: "Offer deactivated" });
  });

  it("allows only one concurrent admin decision for a pending offer", async () => {
    const created = await request(app)
      .post("/api/farmers/offers")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send(offerDraft({ title: "Single decision offer" }));
    const [approved, rejected] = await Promise.all([
      request(app)
        .patch(`/api/admin/offers/${created.body._id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`),
      request(app)
        .patch(`/api/admin/offers/${created.body._id}/reject`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Concurrent review test." }),
    ]);

    expect([approved.status, rejected.status].filter((status) => status === 200)).toHaveLength(1);
    expect([approved.status, rejected.status].filter((status) => status === 409)).toHaveLength(1);
  });

  it("calculates expired status from saved dates instead of trusting an Active database status", async () => {
    const expired = await Offer.create({
      ...offerDraft({ title: "Expired offer", startDate: dates.startDate, endDate: new Date(Date.now() - 86400000).toISOString() }),
      farmer: farmerId,
      status: "Active",
      approvedAt: new Date(),
      approvedBy: (await User.findOne({ role: "admin" }))._id,
    });
    const response = await request(app)
      .get("/api/farmers/offers")
      .set("Authorization", `Bearer ${farmerToken}`)
      .query({ status: "Expired" });

    expect(response.status).toBe(200);
    expect(response.body.items.some((offer) => offer._id === String(expired._id))).toBe(true);
    expect(response.body.items.find((offer) => offer._id === String(expired._id)).effectiveStatus).toBe("Expired");
  });

  it("does not allow another farmer to deactivate an offer and lets the owner deactivate it", async () => {
    const newOffer = await Offer.create({
      ...offerDraft({ title: "Deactivate test offer" }),
      farmer: farmerId,
      status: "Active",
      approvedAt: new Date(),
      approvedBy: (await User.findOne({ role: "admin" }))._id,
    });
    const otherFarmer = await request(app)
      .patch(`/api/farmers/offers/${newOffer._id}/deactivate`)
      .set("Authorization", `Bearer ${otherFarmerToken}`);
    const owner = await request(app)
      .patch(`/api/farmers/offers/${newOffer._id}/deactivate`)
      .set("Authorization", `Bearer ${farmerToken}`);

    expect(otherFarmer.status).toBe(404);
    expect(owner.status).toBe(200);
    expect(owner.body.effectiveStatus).toBe("Inactive");
  });

  describe("Admin offer creation and editing", () => {
    const adminId = () => User.findOne({ role: "admin" }).then((admin) => admin._id);

    it("returns the list of eligible farmers for admin offer creation", async () => {
      const response = await request(app)
        .get("/api/admin/offers/farmers")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.map((farmer) => String(farmer._id))).toEqual(
        expect.arrayContaining([String(farmerId), String(otherFarmerId)])
      );
    });

    it("returns only the selected farmer's eligible products for admin offer creation", async () => {
      const [own, other] = await Promise.all([
        request(app)
          .get("/api/admin/offers/eligible-products")
          .set("Authorization", `Bearer ${adminToken}`)
          .query({ farmerId: String(farmerId) }),
        request(app)
          .get("/api/admin/offers/eligible-products")
          .set("Authorization", `Bearer ${adminToken}`)
          .query({ farmerId: String(otherFarmerId) }),
      ]);
      expect(own.status).toBe(200);
      expect(own.body.map((product) => String(product._id))).toContain(String(productId));
      expect(own.body.map((product) => String(product._id))).not.toContain(String(otherProductId));
      expect(other.status).toBe(200);
      expect(other.body.map((product) => String(product._id))).toContain(String(otherProductId));
      expect(other.body.map((product) => String(product._id))).not.toContain(String(productId));
      expect(own.body[0]).toMatchObject({ name: expect.any(String), price: expect.any(Number), stock: expect.any(Number) });
    });

    it("allows an admin to create an offer for Farmer A's eligible product", async () => {
      const created = await request(app)
        .post("/api/admin/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId), title: "Admin fig offer for farmer A" }) });

      expect(created.status).toBe(201);
      expect(created.body.status).toBe("Active");
      expect(created.body.approvalStatus).toBe("Active");
      expect(String(created.body.farmer?._id)).toBe(String(farmerId));
      expect(String(created.body.product?._id)).toBe(String(productId));

      const saved = await Offer.findById(created.body._id);
      expect(String(saved.createdBy)).toBe((await adminId()).toString());
      expect(String(saved.approvedBy)).toBe((await adminId()).toString());
      expect(saved.approvedAt).toBeInstanceOf(Date);

      const notification = await Notification.findOne({
        user: farmerId, type: "offerCreatedByAdmin", resourceId: created.body._id,
      });
      expect(notification).toMatchObject({ category: "offers", title: "Admin created an offer for your product" });
    });

    it("allows an admin to create an offer for Farmer B's eligible product", async () => {
      const created = await request(app)
        .post("/api/admin/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(otherFarmerId), product: String(otherProductId), title: "Admin fig offer for farmer B" }) });

      expect(created.status).toBe(201);
      expect(created.body.status).toBe("Active");
      expect(String(created.body.farmer?._id)).toBe(String(otherFarmerId));
      expect(String(created.body.product?._id)).toBe(String(otherProductId));

      const saved = await Offer.findById(created.body._id);
      expect(String(saved.createdBy)).toBe((await adminId()).toString());
      expect(saved.approvedAt).toBeInstanceOf(Date);
    });

    it("saves admin-created offers as approved after successful backend validation", async () => {
      const created = await request(app)
        .post("/api/admin/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId), title: "Pre-approved fig offer" }) });

      expect(created.status).toBe(201);
      expect(created.body.effectiveStatus).toBe("Active");
      const saved = await Offer.findById(created.body._id);
      expect(saved.status).toBe("Active");
      expect(saved.isActive).toBe(true);
    });

    it("does not let an admin create an offer for a product belonging to a different farmer", async () => {
      const mismatched = await request(app)
        .post("/api/admin/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId), product: String(otherProductId), title: "Cross farmer offer" }) });

      expect(mismatched.status).toBe(400);

      const missingFarmer = await request(app)
        .post("/api/admin/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ title: "No farmer offer" }) });
      expect(missingFarmer.status).toBe(400);
    });

    it("lets an admin edit an offer created by any farmer", async () => {
      const farmerOffer = await request(app)
        .post("/api/farmers/offers")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send(offerDraft({ title: "Farmer edit target" }));
      expect(farmerOffer.body.status).toBe("Pending");

      const edited = await request(app)
        .patch(`/api/admin/offers/${farmerOffer.body._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId), product: String(productId), title: "Admin edited offer" }) });

      expect(edited.status).toBe(200);
      expect(edited.body.status).toBe("Active");
      expect(edited.body.approvalStatus).toBe("Active");
      expect(String(edited.body.farmer?._id)).toBe(String(farmerId));

      const saved = await Offer.findById(farmerOffer.body._id);
      expect(String(saved.editedBy)).toBe((await adminId()).toString());
      expect(saved.editedAt).toBeInstanceOf(Date);
      expect(saved.rejectionReason).toBe("");
    });

    it("lets an admin change an offer's associated farmer and product when valid", async () => {
      const farmerOffer = await request(app)
        .post("/api/farmers/offers")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send(offerDraft({ title: "Reparent target" }));

      const changed = await request(app)
        .patch(`/api/admin/offers/${farmerOffer.body._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(otherFarmerId), product: String(otherProductId), title: "Reparented offer" }) });

      expect(changed.status).toBe(200);
      expect(changed.body.status).toBe("Active");
      expect(String(changed.body.farmer?._id)).toBe(String(otherFarmerId));
      expect(String(changed.body.product?._id)).toBe(String(otherProductId));
    });

    it("approves an admin-edited offer after successful validation", async () => {
      const farmerOffer = await request(app)
        .post("/api/farmers/offers")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send(offerDraft({ title: "Edit approval target" }));

      const edited = await request(app)
        .patch(`/api/admin/offers/${farmerOffer.body._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId), product: String(productId), discountValue: 25, title: "Edited and approved" }) });

      expect(edited.status).toBe(200);
      expect(edited.body.status).toBe("Active");
      expect(edited.body.effectiveStatus).toBe("Active");
      const saved = await Offer.findById(farmerOffer.body._id);
      expect(String(saved.approvedBy)).toBe((await adminId()).toString());
    });

    it("lets an admin edit and approve a previously rejected offer", async () => {
      const rejected = await Offer.create({
        ...offerDraft({ title: "Rejected edit target" }),
        farmer: farmerId,
        status: "Rejected",
        isActive: false,
        rejectedAt: new Date(),
        rejectedBy: await adminId(),
        rejectionReason: "Needs correction.",
      });

      const edited = await request(app)
        .patch(`/api/admin/offers/${rejected._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId), product: String(productId), title: "Corrected offer" }) });

      expect(edited.status).toBe(200);
      expect(edited.body.status).toBe("Active");

      const saved = await Offer.findById(rejected._id);
      expect(saved.status).toBe("Active");
      expect(saved.isActive).toBe(true);
      expect(saved.rejectionReason).toBe("");
      expect(saved.rejectedBy).toBeUndefined();
    });

    it("rejects invalid admin-created and admin-edited offers", async () => {
      const invalidCreate = await request(app)
        .post("/api/admin/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId), discountValue: 0, title: "Invalid create" }) });
      expect(invalidCreate.status).toBe(400);

      const pending = await request(app)
        .post("/api/farmers/offers")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send(offerDraft({ title: "Invalid edit target" }));

      const reversedDates = await request(app)
        .patch(`/api/admin/offers/${pending.body._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId), product: String(productId), endDate: dates.startDate, title: "Invalid edit" }) });
      expect(reversedDates.status).toBe(400);

      const foreignEdit = await request(app)
        .patch(`/api/admin/offers/${pending.body._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId), product: String(otherProductId), title: "Foreign product" }) });
      expect(foreignEdit.status).toBe(400);
    });

    it("does not allow farmers to use admin create or edit permissions", async () => {
      const farmerCreate = await request(app)
        .post("/api/admin/offers")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send({ ...offerDraft({ farmer: String(farmerId) }) });
      expect(farmerCreate.status).toBe(403);

      const farmerEdit = await request(app)
        .patch(`/api/admin/offers/${offerId}`)
        .set("Authorization", `Bearer ${farmerToken}`)
        .send({ ...offerDraft({ title: "Farmer admin edit" }) });
      expect(farmerEdit.status).toBe(403);
    });

    it("keeps farmer-created and farmer-edited offers pending until an admin approves them", async () => {
      const created = await request(app)
        .post("/api/farmers/offers")
        .set("Authorization", `Bearer ${farmerToken}`)
        .send(offerDraft({ title: "Farmer created pending" }));
      expect(created.status).toBe(201);
      expect(created.body.status).toBe("Pending");

      const edited = await request(app)
        .patch(`/api/farmers/offers/${created.body._id}`)
        .set("Authorization", `Bearer ${farmerToken}`)
        .send(offerDraft({ title: "Farmer edited pending" }));
      expect(edited.status).toBe(200);
      expect(edited.body.status).toBe("Pending");

      const approved = await request(app)
        .patch(`/api/admin/offers/${created.body._id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(approved.status).toBe(200);
      expect(approved.body.status).toBe("Active");
    });
  });
});
