const mongoose = require("mongoose");

// Module 2.4 — an AI-generated learning path for a language or technology
// that has no built-in course (e.g. Go, Kotlin, SQL, Django).
const stageSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true },
    duration:  { type: String, default: "" },   // e.g. "Week 1–2"
    concepts:  { type: [String], default: [] },
    exercises: { type: [String], default: [] },
    debugging: { type: [String], default: [] },
    project:   { title: { type: String, default: "" }, desc: { type: String, default: "" } },
    done:      { type: Boolean, default: false },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic:        { type: String, required: true },
    goal:         { type: String, default: "" },
    experience:   { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    hoursPerWeek: { type: Number, default: 5 },
    title:        { type: String, required: true },
    overview:     { type: String, default: "" },
    stages:       { type: [stageSchema], default: [] },
    capstone:     { title: { type: String, default: "" }, desc: { type: String, default: "" } },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Roadmap", roadmapSchema);
