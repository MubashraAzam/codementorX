const mongoose = require("mongoose");
const { LANGUAGES } = require("../data/curriculum");

const progressSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  language:       { type: String, enum: LANGUAGES, required: true },
  doneLevels:     { type: [Number], default: [] },
  stars:          { type: Map, of: Number, default: {} },
  currentLevel:   { type: Number, default: 0 },
  solvedProjects: {
    type: Map,
    of: new mongoose.Schema({
      stars: Number, feedback: String, fileName: String,
      rubric: { type: Object, default: null },
      similarity: { type: Number, default: 0 },
      flagged: { type: Boolean, default: false }, // Module 4.4: too similar to another student's code
    }, { _id: false }),
    default: {},
  },
  interview: {
    percentage: { type: Number, default: null },
    feedback:   { type: String, default: "" },
    passed:     { type: Boolean, default: false },
  },
  // Module 2.2 — latest assessment report per level ("0".."19"), used for the
  // topic-wise performance report and, later, weak-topic detection (Module 9).
  levelReports: { type: Map, of: Object, default: {} },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Progress", progressSchema);