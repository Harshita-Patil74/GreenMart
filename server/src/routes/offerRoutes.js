const express = require("express");
const router = express.Router();
const controller = require("../controllers/offerController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");
const { approvedFarmer } = require("../middleware/approvedFarmer");
const { validate } = require("../middleware/validate");
const { createOfferSchema, updateOfferSchema } = require("../utils/offerValidation");

router.use(auth, role("farmer"), approvedFarmer);
router.get("/eligible-products", controller.eligibleProducts);
router.get("/stats", controller.farmerStats);
router.get("/", controller.farmerList);
router.get("/:offerId", controller.farmerGet);
router.post("/", validate(createOfferSchema), controller.farmerCreate);
router.patch("/:offerId", validate(updateOfferSchema), controller.farmerUpdate);
router.patch("/:offerId/deactivate", controller.farmerDeactivate);

module.exports = router;
