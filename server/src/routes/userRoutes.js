const express = require("express");
const router = express.Router();
const c = require("../controllers/userController");
const { auth } = require("../middleware/auth");
const { uploadAvatar } = require("../middleware/upload");
router.patch("/me", auth, uploadAvatar.single("avatar"), c.updateMe);
module.exports = router;
