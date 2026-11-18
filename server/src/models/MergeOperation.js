const mongoose = require("mongoose");
const MergeOperationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  operationKey: { type: String, required: true },
  claimOwner: { type: String },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  result: { type: mongoose.Schema.Types.Mixed },
  itemsSnapshot: { type: Array, default: [] },
  cartMutated: { type: Boolean, default: false },
  claimedAt: { type: Date },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
MergeOperationSchema.index({ userId: 1, operationKey: 1 }, { unique: true });
MergeOperationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
module.exports = mongoose.model("MergeOperation", MergeOperationSchema);
