const mongoose = require("mongoose");

const AdminAuditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model("AdminAuditLog", AdminAuditLogSchema);
