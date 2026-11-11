// backend/models/OTP.js
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  purpose: { type: String, enum: ['signup', 'reset'], default: 'signup' }
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL delete after expiresAt

module.exports = mongoose.model("OTP", otpSchema);
