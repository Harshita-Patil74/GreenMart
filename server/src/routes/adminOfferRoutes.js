const express = require("express");
const router = express.Router();
const controller = require("../controllers/offerController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");
const { validate } = require("../middleware/validate");
const { rejectOfferSchema } = require("../utils/offerValidation");

router.use(auth, role("admin"));
router.get("/farmers", controller.adminFarmers);
router.get("/eligible-products", controller.adminEligibleProducts);
router.get("/options", controller.adminOptions);
router.get("/", controller.adminList);
router.get("/:offerId", controller.adminGet);
router.post("/", controller.adminCreate);
router.patch("/:offerId", controller.adminUpdate);
router.patch("/:offerId/approve", controller.adminApprove);
router.patch("/:offerId/reject", validate(rejectOfferSchema), controller.adminReject);
router.patch("/:offerId/deactivate", controller.adminDeactivate);

module.exports = router;
