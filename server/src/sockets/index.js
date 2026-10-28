const jwt = require("jsonwebtoken");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");
const env = require("../config/env");

function setupSockets(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(decoded.id).select("_id role status");
      if (!user || user.status === "blocked") return next(new Error("Unauthorized"));
      socket.userId = String(user._id);
      socket.role = user.role;
      if (user.role === "farmer") {
        const profile = await FarmerProfile.findOne({ user: user._id })
          .select("certification.verifiedByAdmin");
        socket.farmerApproved = Boolean(profile?.certification?.verifiedByAdmin);
      }
      next();
    } catch (e) { next(new Error("Unauthorized")); }
  });
  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    if (socket.role === "farmer" && socket.farmerApproved) socket.join(`farmer:${socket.userId}`);
    if (socket.role === "admin") socket.join("admins");
    socket.on("disconnect", () => {});
  });
}
module.exports = setupSockets;
module.exports.setupSockets = setupSockets;
