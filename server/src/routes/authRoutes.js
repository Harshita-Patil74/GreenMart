const express = require("express");
const router = express.Router();
const c = require("../controllers/authController");
const { auth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { z } = require("zod");
const {
  emailPattern,
  demoEmailPattern,
  passwordValidationMessage,
} = require("../utils/authValidation");
const registrationPassword = z.string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/\d/, "Password must include a number.")
  .regex(/[@#$!%&*]/, "Password must include one of these special characters: @ # $ ! % & *.")
  .regex(/^\S+$/, "Password must not contain spaces.");
const registrationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string()
      .regex(emailPattern, "Enter a valid lowercase email address.")
      .transform((email) => email.toLowerCase()),
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
    email: z.string().trim().email().transform((email) => email.toLowerCase()),
    token: z.string().min(1),
    password: registrationPassword,
  }),
});
const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email().transform((email) => email.toLowerCase()),
  }),
});
const activationSchema = z.object({
  body: z.object({
    email: z.string().trim().email().transform((email) => email.toLowerCase()),
    token: z.string().min(1),
    password: registrationPassword,
  }),
});
const loginBody = z.object({
    email: z.string()
      .regex(emailPattern, "Enter a valid lowercase email address.")
      .transform((email) => email.toLowerCase()),
    password: z.string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/^\S+$/, "Password must not contain spaces."),
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
router.post("/refresh", c.refresh);
router.post("/logout", c.logout);
router.get("/me", auth, c.me);
router.post("/forgot-password", validate(forgotPasswordSchema), c.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), c.resetPassword);
router.post("/activate-account", validate(activationSchema), c.activateAccount);
module.exports = router;
