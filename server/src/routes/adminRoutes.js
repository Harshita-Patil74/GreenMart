const express = require("express");
const router = express.Router();
const c = require("../controllers/adminController");
const { auth } = require("../middleware/auth");
const { role } = require("../middleware/role");
const { validate } = require("../middleware/validate");
const { z } = require("zod");
const { emailPattern } = require("../utils/authValidation");

const createFarmerSchema = {
  body: z.object({
    name: z.string().trim().min(1, "Farmer name is required."),
    email: z.string()
      .regex(emailPattern, "Enter a valid lowercase email address.")
      .transform((email) => email.toLowerCase()),
    phone: z.string().optional(),
    farmName: z.string().optional(),
    farmAddress: z.string().optional(),
    farmCategory: z.string().optional(),
    about: z.string().optional(),
    certificationName: z.string().trim().max(100, "Certification name is too long.").optional().default(""),
    certificateNumber: z.string().trim().max(50, "Certificate number is too long.").optional().default(""),
  }),
};

router.get("/stats", auth, role("admin"), c.stats);
router.get("/users", auth, role("admin"), c.users);
router.get("/low-stock", auth, role("admin"), c.lowStock);
router.get("/sales", auth, role("admin"), c.sales);
router.get("/categories-share", auth, role("admin"), c.categoriesShare);
router.get("/reports", auth, role("admin"), c.reports);
router.get("/reports/pdf", auth, role("admin"), c.reportPdf);
router.patch("/users/:id", auth, role("admin"), c.updateUser);
router.get("/farmers", auth, role("admin"), c.farmers);
router.post("/farmers", auth, role("admin"), validate(z.object(createFarmerSchema)), c.createFarmer);
router.post("/farmers/:id/activation", auth, role("admin"), c.resendFarmerActivation);
router.patch("/farmers/:id/verify", auth, role("admin"), c.verifyFarmer);
router.patch("/farmers/:id/reject", auth, role("admin"), c.rejectFarmer);
router.patch("/farmers/:id/request-changes", auth, role("admin"), c.requestFarmerChanges);
router.get("/farmers/:farmerId/land-review", auth, role("admin"), c.getLandReview);
router.put("/farmers/:farmerId/land-review", auth, role("admin"), c.updateLandReview);
module.exports = router;
