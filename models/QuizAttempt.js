const mongoose = require("mongoose");

// One generated level quiz. The correct answers live only here on the server;
// the client receives questions and options, and learns whether an answer was
// right only after it has been locked in.
const questionSchema = new mongoose.Schema(
  {
    q:    { type: String, required: true },
    opts: { type: [String], required: true },
    ans:  { type: Number, required: true },
    exp:  { type: String, default: "" },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    language:   { type: String, enum: ["python", "cpp"], required: true },
    levelIndex: { type: Number, required: true, min: 0, max: 19 },
    questions:  { type: [questionSchema], required: true },
    answers:    { type: [Number], default: [] }, // -1 = not answered yet
    status:     { type: String, enum: ["active", "completed"], default: "active" },
    score:      { type: Number, default: null }, // percentage 0-100
    stars:      { type: Number, default: null },
    completedAt:{ type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
