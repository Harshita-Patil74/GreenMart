const express = require("express");
const router = express.Router();
const c = require("../controllers/messageController");
const { auth } = require("../middleware/auth");
router.post("/", auth, c.send);
router.get("/", auth, c.list);
module.exports = router;
