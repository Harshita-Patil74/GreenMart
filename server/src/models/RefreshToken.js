const mongoose = require("mongoose");
const RefreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  family: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  revoked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("RefreshToken", RefreshTokenSchema);
