const mongoose = require("mongoose");
const { LANGUAGES } = require("../data/curriculum");

const interviewRunSchema = new mongoose.Schema(
  {
    workflowRunId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    language: { type: String, enum: LANGUAGES, required: true },
    status: { type: String, enum: ["started", "completed"], default: "started" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewRun", interviewRunSchema);
