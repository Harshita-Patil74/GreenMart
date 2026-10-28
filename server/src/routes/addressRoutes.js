const express = require("express");
const router = express.Router();
const c = require("../controllers/addressController");
const { auth } = require("../middleware/auth");
router.get("/", auth, c.list);
router.post("/", auth, c.create);
router.put("/:id", auth, c.update);
router.delete("/:id", auth, c.remove);
module.exports = router;
