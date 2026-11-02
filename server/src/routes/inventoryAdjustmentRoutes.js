const express = require("express");
const router = express.Router();
const c = require("../controllers/inventoryAdjustmentController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");
router.post("/:inventoryId/adjustments", auth, role("farmer"), c.createAdjustment);
router.get("/:inventoryId/history", auth, role("farmer"), c.historyForItem);
router.get("/history", auth, role("farmer"), c.historyAll);
module.exports = router;
