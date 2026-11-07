const NewsletterSubscription = require("../models/NewsletterSubscription");
const Newsletter = require("../models/Newsletter");
const User = require("../models/User");

async function isPremiumCustomer(userId) {
  if (!userId) return false;
  const user = await User.findById(userId).select("role status email");
  if (!user || user.role !== "customer" || user.status && user.status !== "active") return false;
  const subscription = await NewsletterSubscription.findOne({ user: userId }).sort({ createdAt: -1 });
  const now = new Date();
  if (!subscription || subscription.status !== "active" || !subscription.endDate || now > subscription.endDate) return false;
  const email = String(user.email || "").trim().toLowerCase();
  if (!email) return false;
  const newsletter = await Newsletter.findOne({ email });
  if (!newsletter || !newsletter.isActive) return false;
  return true;
}

module.exports = { isPremiumCustomer };