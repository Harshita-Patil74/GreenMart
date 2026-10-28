async function approvedFarmer(req, res, next) {
  if (req.user.role !== "farmer") return next();
  if (req.user.farmerApproved !== true) {
    return res.status(403).json({ message: "Farmer account is awaiting admin approval." });
  }
  next();
}

module.exports = { approvedFarmer };
