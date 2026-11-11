const mongoose = require("mongoose");

// Tracks when a specific user last "read" a session's discussion.
// Used to calculate unread message counts (WhatsApp-style).
const userSessionReadSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  session:     { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
  lastSeenAt:  { type: Date, default: Date.now },
}, { timestamps: false });

// Compound unique index so there's exactly one record per user+session
userSessionReadSchema.index({ user: 1, session: 1 }, { unique: true });

module.exports = mongoose.model("UserSessionRead", userSessionReadSchema);
