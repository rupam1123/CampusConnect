// backend/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  identityId: { type: String, sparse: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Professor'] },
  // Notice these are NOT required at the database level so Mongoose won't crash
  username: { type: String, unique: true, sparse: true }, 
  name: { type: String },
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model("User", userSchema);
