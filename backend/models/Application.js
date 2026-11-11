const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rollNo:  { type: String, required: true },
  name:    { type: String, required: true },
  branch:  { type: String, required: true },
  batch:   { type: String, required: true },
  cpi:     { type: Number, required: true, min: 0, max: 10 },
  resume:  { type: String, required: true },
  status:  { type: String, enum: ["Pending", "Accepted", "Rejected"], default: "Pending" }
}, { timestamps: true });

applicationSchema.index({ project: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);