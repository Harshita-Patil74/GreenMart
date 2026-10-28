const express = require("express");
const router = express.Router();
const c = require("../controllers/reviewController");
const { auth } = require("../middleware/auth");
router.get("/:id/reviews", c.list);
router.get("/:id/review-eligibility", auth, c.eligibility);
router.post("/:id/reviews", auth, c.create);
module.exports = router;
