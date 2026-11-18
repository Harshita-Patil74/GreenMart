const mongoose = require("mongoose");
const CartLockSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  owner: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
CartLockSchema.index({ userId: 1 }, { unique: true });
CartLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

CartLockSchema.statics.renewLock = function (userId, owner, ttlMs) {
  return this.findOneAndUpdate(
    { userId, owner },
    { $set: { expiresAt: new Date(Date.now() + ttlMs) } },
    { new: true }
  );
};

CartLockSchema.statics.takeExpiredLock = function (userId, owner, ttlMs) {
  const now = new Date();
  return this.findOneAndUpdate(
    { userId, expiresAt: { $lt: now } },
    { $set: { owner, expiresAt: new Date(Date.now() + ttlMs) } },
    { new: true }
  );
};

module.exports = mongoose.model("CartLock", CartLockSchema);
