const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["customer","farmer","admin"], default: "customer" },
  phone: String,
  avatar: String,
  emailNotifications: { type: Boolean, default: true },
  status: { type: String, default: "active" },
  resetTokenHash: String,
  resetTokenExpiry: Date,
  isDemo: { type: Boolean, default: false } }, { timestamps: true });

UserSchema.methods.comparePassword = function (p) { return bcrypt.compare(p, this.passwordHash); };
module.exports = mongoose.model("User", UserSchema);




