require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { loginEmailPattern, passwordValidationMessage } = require("../utils/authValidation");

async function createAdminAccount(email, password) {
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  if (!loginEmailPattern.test(normalizedEmail)) {
    throw new Error("ADMIN_EMAIL must be a valid lowercase email address.");
  }
  if (typeof password !== "string" || passwordValidationMessage(password)) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters and include lowercase, uppercase, numeric, and special characters.");
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    if (existing.role !== "admin") {
      throw new Error("The configured ADMIN_EMAIL belongs to a non-admin account; refusing to change its role.");
    }
    return { created: false, email: normalizedEmail };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      name: "GreenMart Administrator",
      email: normalizedEmail,
      passwordHash,
      role: "admin",
    });
    return { created: true, email: normalizedEmail };
  } catch (error) {
    if (error.code !== 11000) throw error;
    const concurrentExisting = await User.findOne({ email: normalizedEmail });
    if (concurrentExisting?.role === "admin") {
      return { created: false, email: normalizedEmail };
    }
    throw new Error("An account with ADMIN_EMAIL already exists and is not an administrator.");
  }
}

async function main() {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGO_URI) throw new Error("MONGO_URI is required.");
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in the server environment.");
  }

  await mongoose.connect(MONGO_URI);
  try {
    const result = await createAdminAccount(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log(result.created
      ? `Created admin account for ${result.email}.`
      : `Admin account for ${result.email} already exists; left it unchanged.`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Admin setup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { createAdminAccount };
