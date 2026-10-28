const express = require("express");
const router = express.Router();
const c = require("../controllers/authController");
const { auth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { z } = require("zod");
const {
  gmailEmailPattern,
  demoEmailPattern,
  loginEmailPattern,
  passwordValidationMessage,
} = require("../utils/authValidation");
const registrationPassword = z.string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/\d/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character.");
const registrationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().regex(gmailEmailPattern, "Use a lowercase Gmail address, such as name@gmail.com."),
    password: registrationPassword,
    role: z.string().optional(),
    adminCode: z.string().optional(),
    farmName: z.string().optional(),
    farmAddress: z.string().optional(),
    location: z.any().optional(),
  }),
});
const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    token: z.string().min(1),
    password: registrationPassword,
  }),
});
const loginBody = z.object({
    email: z.string().trim().regex(loginEmailPattern, "Enter a valid lowercase email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
  }).superRefine(({ email, password }, context) => {
    if (demoEmailPattern.test(email)) return;
    const message = passwordValidationMessage(password);
    if (message) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message });
    }
  });
const loginSchema = z.object({
  body: loginBody,
});
router.post("/register", validate(registrationSchema), c.register);
router.post("/login", validate(loginSchema), c.login);
router.get("/me", auth, c.me);
router.post("/forgot-password", c.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), c.resetPassword);
module.exports = router;
