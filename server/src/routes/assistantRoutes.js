const express = require("express");
const router = express.Router();
const c = require("../controllers/assistantController");
const { auth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { z } = require("zod");
const chatSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1).max(500),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().max(500),
    })).max(20).optional(),
  }),
});
router.post("/chat", auth, validate(chatSchema), c.chat);
module.exports = router;
