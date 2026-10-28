const express = require("express");
const router = express.Router();
const c = require("../controllers/notificationController");
const { auth } = require("../middleware/auth");
router.get("/", auth, c.list);
router.get("/unread-count", auth, c.unreadCount);
router.patch("/:id/read", auth, c.markRead);
router.patch("/read-all", auth, c.markAllRead);
module.exports = router;
