const express = require("express");
const router = express.Router();
const c = require("../controllers/newsletterController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");

router.post("/subscribe", c.subscribe);
router.post("/unsubscribe", c.unsubscribe);
router.get("/", auth, role("admin"), c.list);

module.exports = router;
