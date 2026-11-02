const express = require("express");
const router = express.Router();
const c = require("../controllers/salesController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");
router.get("/overview", auth, role("farmer"), c.overview);
router.get("/", auth, role("farmer"), c.list);
module.exports = router;
