const express = require("express");
const router = express.Router();
const c = require("../controllers/newsletterController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");

router.post("/subscribe", c.subscribe);
router.post("/unsubscribe", c.unsubscribe);
router.get("/unsubscribe/confirm", c.unsubscribeByToken);
router.post("/unsubscribe/confirm", c.unsubscribeByToken);

router.get("/admin/stats", auth, role("admin"), c.stats);
router.get("/admin/subscribers", auth, role("admin"), c.list);
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

router.post("/webhooks/resend", c.webhook);

router.get("/", auth, role("admin"), c.list);

module.exports = router;
