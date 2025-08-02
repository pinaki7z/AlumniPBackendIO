const mongoose = require("mongoose");

const notificationCenterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Alumni" }, // nullable if global
  type: { type: String, enum: ["job", "internship", "event", "post", "admin"], required: true },
  title: String,
  message: String,
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  read: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Alumni" }],
  createdAt: { type: Date, default: Date.now },
  global: { type: Boolean, default: false }, // <--- add this
  notificationOff: { type: Boolean, default: false },
  meta: mongoose.Schema.Types.Mixed, // for extra info
});

module.exports = mongoose.model("NotificationCenter", notificationCenterSchema);
