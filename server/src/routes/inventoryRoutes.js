const express = require("express");
const router = express.Router();
const c = require("../controllers/inventoryController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");
router.get("/", auth, role("farmer"), c.list);
router.get("/:inventoryId", auth, role("farmer"), c.getOne);
module.exports = router;
