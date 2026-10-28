const express = require("express");
const router = express.Router();
const c = require("../controllers/settingsController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");
router.get("/", c.get);
router.put("/", auth, role("admin"), c.update);
module.exports = router;
