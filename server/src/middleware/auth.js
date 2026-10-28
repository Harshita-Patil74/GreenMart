const jwt = require("jsonwebtoken");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");
const env = require("../config/env");

async function auth(req, res, next) {
  let decoded;
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.status === "blocked") return res.status(403).json({ message: "Account blocked" });
    req.user = user.toObject();
    if (user.role === "farmer") {
      const farmerProfile = await FarmerProfile.findOne({ user: user._id })
        .select("certification.verifiedByAdmin");
      req.user.farmerApproved = Boolean(farmerProfile?.certification?.verifiedByAdmin);
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { auth };
