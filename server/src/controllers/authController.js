const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");
const bcrypt = require("bcryptjs");
const { signToken, randomToken, hashToken } = require("../utils/tokens");
const { sendEmail } = require("../services/emailService");
const env = require("../config/env");
const { passwordValidationMessage } = require("../utils/authValidation");

async function authUserPayload(user) {
  const payload = { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || "" };
  if (user.role === "farmer") {
    const profile = await FarmerProfile.findOne({ user: user._id })
      .select("certification.verifiedByAdmin");
    payload.farmerApproved = Boolean(profile?.certification?.verifiedByAdmin);
  }
  return payload;
}

exports.register = async (req,res) => {
  const { name, password, farmName, farmAddress, location } = req.body;
  const email = req.body.email.toLowerCase();
  // Public registration may only create customer or farmer accounts.
  // Admin accounts must be created through trusted server-side processes.
  const requestedRole = req.body.role;
  const role = requestedRole === "farmer" ? "farmer" : "customer";
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "Email is already registered." });
  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await User.create({ name, email, passwordHash, role });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Email is already registered." });
    }
    throw error;
  }
  if (role === "farmer") {
    const FarmerProfile = require("../models/FarmerProfile");
    await FarmerProfile.create({ user: user._id, farmName: farmName || name+" Farm", address: farmAddress, location });
  }
  const token = signToken(user);
  sendEmail("welcome", user.email, user).catch((error) => {
    console.warn("Welcome email was not delivered:", error?.code || "EMAIL_ERROR");
  });
  res.json({ token, user: await authUserPayload(user) });
};

exports.login = async (req,res) => {
  const { password } = req.body;
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email });
  if (user && user.accountActivated === false) {
    return res.status(403).json({ message: "Activate your account using the link sent to your email." });
  }
  if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: "Invalid credentials" });
  const passwordError = passwordValidationMessage(password);
  const isConfiguredDemoAccount = user.isDemo && email.endsWith("@demo.greenmart.test");
  if (passwordError && !isConfiguredDemoAccount && process.env.NODE_ENV !== "test") {
    return res.status(400).json({ message: passwordError });
  }
  if (user.status === "blocked") return res.status(403).json({ message: "Account blocked" });
  const token = signToken(user);
  res.json({ token, user: await authUserPayload(user) });
};

exports.me = async (req,res) => { res.json(req.user); };

exports.forgotPassword = async (req,res) => {
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email });
  if (user && user.accountActivated !== false) {
    const token = randomToken();
    user.resetTokenHash = await hashToken(token);
    user.resetTokenExpiry = new Date(Date.now()+3600000);
    await user.save();
    const link = `${env.clientUrl}/reset-password?email=${encodeURIComponent(email)}#token=${token}`;
    try {
      await sendEmail("passwordReset", user.email, link);
    } catch (error) {
      console.warn("Password reset email was not delivered:", error?.code || "EMAIL_ERROR");
    }
  }
  res.json({ message: "If an account exists, the password reset request will be processed." });
};

exports.resetPassword = async (req,res) => {
  const { token, password } = req.body;
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email });
  if (!user || user.accountActivated === false || !user.resetTokenHash || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) return res.status(400).json({ message: "Invalid token" });
  const ok = await bcrypt.compare(token, user.resetTokenHash);
  if (!ok) return res.status(400).json({ message: "Invalid token" });
  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetTokenHash = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();
  res.json({ message: "Password reset" });
};

exports.activateAccount = async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({ email: req.body.email.toLowerCase(), role: "farmer" });
  if (!user || user.accountActivated !== false || !user.activationTokenHash || !user.activationTokenExpiry || user.activationTokenExpiry < new Date()) {
    return res.status(400).json({ message: "Invalid or expired activation link." });
  }
  if (!(await bcrypt.compare(token, user.activationTokenHash))) {
    return res.status(400).json({ message: "Invalid or expired activation link." });
  }
  user.passwordHash = await bcrypt.hash(password, 10);
  user.accountActivated = true;
  user.activationTokenHash = undefined;
  user.activationTokenExpiry = undefined;
  await user.save();
  res.json({ message: "Account activated. You can now sign in." });
};
