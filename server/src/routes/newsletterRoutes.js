const express = require("express");
const router = express.Router();
const c = require("../controllers/newsletterController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");

// Customer newsletter preferences & subscription (authenticated customers only)
router.get("/preferences", auth, role("customer"), c.preferences);
router.post("/preferences/subscribe", auth, role("customer"), c.customerSubscribe);
router.post("/preferences/unsubscribe", auth, role("customer"), c.customerUnsubscribe);

// Customer newsletter inbox (authenticated customers only)
router.get("/customer/newsletters", auth, role("customer"), c.customerNewsletters);
router.get("/customer/newsletters/:id", auth, role("customer"), c.customerNewsletterDetail);
router.patch("/customer/newsletters/:id/read", auth, role("customer"), c.markNewsletterRead);
router.get("/customer/offers", auth, role("customer"), c.customerExclusiveOffers);

router.get("/admin/subscribers", auth, role("admin"), c.list);
router.get("/admin/stats", auth, role("admin"), c.stats);
router.get("/admin/products", auth, role("admin"), c.products);
router.get("/admin/offers", auth, role("admin"), c.offers);
router.post("/admin/subscribers/:id/unsubscribe", auth, role("admin"), c.subscriberUnsubscribe);
router.post("/admin/subscribers/:id/reactivate", auth, role("admin"), c.subscriberReactivate);

router.get("/admin/campaigns", auth, role("admin"), c.campaigns);
router.post("/admin/campaigns", auth, role("admin"), c.createCampaign);
router.get("/admin/campaigns/:id", auth, role("admin"), c.getCampaign);
router.put("/admin/campaigns/:id", auth, role("admin"), c.updateCampaign);
router.post("/admin/campaigns/:id/duplicate", auth, role("admin"), c.duplicateCampaign);
router.post("/admin/campaigns/:id/test", auth, role("admin"), c.sendTest);
router.post("/admin/campaigns/:id/send", auth, role("admin"), c.sendCampaign);
router.post("/admin/campaigns/:id/cancel", auth, role("admin"), c.cancelCampaign);
router.get("/admin/campaigns/:id/recipients", auth, role("admin"), c.recipients);

router.get("/", auth, role("admin"), c.list);

module.exports = router;
