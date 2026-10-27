const mongoose = require("mongoose");
const { LANGUAGES } = require("../data/curriculum");

// Module 3.1 — cached AI teaching content per level. Lessons and practice sets
// are shared by all students on the same level and language, so they load
// instantly and the free AI quota is not spent on every page view.
// "Regenerate" replaces the cached copy.
const mentorContentSchema = new mongoose.Schema(
  {
    language:   { type: String, enum: LANGUAGES, required: true },
    levelIndex: { type: Number, required: true, min: 0, max: 19 },
    kind:       { type: String, enum: ["lesson", "practice"], required: true },
    uiLang:     { type: String, enum: ["English", "Urdu"], default: "English" },
    text:       { type: String, default: "" },        // lesson markdown
    exercises:  { type: [Object], default: undefined }, // practice: [{ title, description, expectedOutput, starterCode }]
  },
  { timestamps: true }
);
mentorContentSchema.index({ language: 1, levelIndex: 1, kind: 1, uiLang: 1, createdAt: -1 });

module.exports = mongoose.model("MentorContent", mentorContentSchema);
