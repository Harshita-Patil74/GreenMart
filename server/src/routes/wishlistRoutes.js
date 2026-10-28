const express = require("express");
const router = express.Router();
const c = require("../controllers/wishlistController");
const { auth } = require("../middleware/auth");
router.get("/", auth, c.get);
router.post("/toggle", auth, c.toggle);
module.exports = router;
