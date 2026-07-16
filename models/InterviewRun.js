const mongoose = require("mongoose");

const interviewRunSchema = new mongoose.Schema(
  {
    workflowRunId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    language: { type: String, enum: ["python", "cpp"], required: true },
    status: { type: String, enum: ["started", "completed"], default: "started" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewRun", interviewRunSchema);
