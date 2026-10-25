const mongoose = require("mongoose");
const { LANGUAGES } = require("../data/curriculum");

// One generated level quiz. The correct answers live only here on the server;
// the client receives questions and options, and learns whether an answer was
// right only after it has been locked in.
const questionSchema = new mongoose.Schema(
  {
    // Module 2.2 — concept MCQ, predict-the-output, or find-the-bug.
    type:  { type: String, enum: ["concept", "output", "debug"], default: "concept" },
    topic: { type: String, default: "" },
    code:  { type: String, default: "" },
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
    language:   { type: String, enum: LANGUAGES, required: true },
    levelIndex: { type: Number, required: true, min: 0, max: 19 },
    questions:  { type: [questionSchema], required: true },
    answers:    { type: [Number], default: [] }, // -1 = not answered yet
    status:     { type: String, enum: ["active", "completed"], default: "active" },
    score:      { type: Number, default: null }, // percentage 0-100
    stars:      { type: Number, default: null },
    completedAt:{ type: Date, default: null },
    report:     { type: Object, default: null }, // topic-wise and type-wise result
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
