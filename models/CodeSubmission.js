const mongoose = require("mongoose");
const { LANGUAGES } = require("../data/curriculum");

// Module 4.3 / 4.4 — every project submission is kept so it can be reviewed
// later and compared with other students' code for similarity.
const codeSubmissionSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    language:     { type: String, enum: LANGUAGES, required: true },
    projectId:    { type: Number, required: true },
    fileName:     { type: String, default: "" },
    source:       { type: String, enum: ["upload", "editor"], default: "upload" },
    code:         { type: String, required: true },
    fingerprints: { type: [Number], default: [] },
    stars:        { type: Number, default: 0 },
    feedback:     { type: String, default: "" },
    rubric:       { type: Object, default: null },  // { requirements, correctness, quality, structure } each 0-10
    similarity:   { type: Number, default: 0 },     // highest similarity to another student's submission (0-1)
    matchedSubmissionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    flagged:      { type: Boolean, default: false }, // similarity above the threshold: needs admin review
  },
  { timestamps: true }
);
codeSubmissionSchema.index({ language: 1, projectId: 1, createdAt: -1 });

module.exports = mongoose.model("CodeSubmission", codeSubmissionSchema);
