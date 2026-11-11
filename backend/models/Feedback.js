const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ratings: {
    content: { type: Number, required: true },
    delivery: { type: Number, required: true },
    clarity: { type: Number, required: true },
    engagement: { type: Number, required: true },
    pace: { type: Number, required: true }
  },
  comment: { type: String } // Optional text feedback
}, { timestamps: true });

// Ensure a student can only submit feedback once per session
feedbackSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", feedbackSchema);