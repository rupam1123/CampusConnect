// backend/models/Professor.js
const mongoose = require("mongoose");

const professorSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  name: { type: String }
});

module.exports = mongoose.model("Professor", professorSchema);