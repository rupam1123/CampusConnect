const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  branches:    { type: [String], required: true }, // e.g. ["CSE", "EE"] or ["ALL"]
  batches:     { type: [String], required: true }, // e.g. ["2021", "2022"] or ["ALL"]
  cpi:         { type: Number, required: true, min: 0, max: 10 }, // Min CPI (0 = open to all)
  skills:      { type: String, default: "" },
  duration:    { type: String, default: "" },
  professor:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status:      { type: String, enum: ["Open", "Closed"], default: "Open" }
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);