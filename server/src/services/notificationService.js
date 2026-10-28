const Notification = require("../models/Notification");
const { emitToUser, emitToFarmer, emitToAdmins } = require("../sockets/emitters");
const User = require("../models/User");
const emailService = require("./emailService");

async function createNotification({ userId, type, title, message, orderId }) {
  const n = await Notification.create({ user: userId, type, title, message, orderId });
  const user = await User.findById(userId);
  // emit
  if (user.role === "farmer") emitToFarmer(userId, "notification:new", n);
  else if (user.role === "admin") emitToAdmins("notification:new", n);
  else emitToUser(userId, "notification:new", n);
  if (user.emailNotifications) {
    // async email not blocking
    emailService.sendEmail(type, user.email, { ...n.toObject(), orderNumber: orderId }).catch((error) => {
      console.warn("Notification email was not delivered:", error?.code || "EMAIL_ERROR");
    });
  }
  return n;
}

module.exports = { createNotification };
