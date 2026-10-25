const express = require("express");
const mongoose = require("mongoose");
const Roadmap = require("../models/Roadmap");
const { protect } = require("../middleware/authMiddleware");
const { askGroq } = require("../utils/aiProviders");
const { parseAIJson } = require("../utils/aiJson");
const { LANGUAGES, LANG_LABEL } = require("../data/curriculum");

// Module 2.4 — AI Roadmap Generator for languages without a built-in course.
const router = express.Router();

const MAX_SAVED = 30;
const COOLDOWN_MS = 15 * 1000;
const EXPERIENCE = ["beginner", "intermediate", "advanced"];

const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v, maxItems, maxLen) =>
  (Array.isArray(v) ? v : []).map((x) => text(x, maxLen)).filter(Boolean).slice(0, maxItems);

// If someone asks for a language we already teach, point them to the full course.
function builtInTrackFor(topic) {
  const t = topic.toLowerCase().replace(/\s+/g, "");
  const aliases = { "c++": "cpp", cpp: "cpp", js: "javascript", "reactjs": "react", "react.js": "react" };
  if (aliases[t]) return aliases[t];
  return LANGUAGES.find((l) => LANG_LABEL[l].toLowerCase().replace(/\s+/g, "") === t) || null;
}

function cleanRoadmap(raw, topic) {
  const stages = (Array.isArray(raw?.stages) ? raw.stages : [])
    .map((s) => ({
      title: text(s?.title, 100),
      duration: text(s?.duration, 40),
      concepts: list(s?.concepts, 10, 120),
      exercises: list(s?.exercises, 6, 240),
      debugging: list(s?.debugging, 4, 240),
      project: { title: text(s?.project?.title, 100), desc: text(s?.project?.desc, 400) },
      done: false,
    }))
    .filter((s) => s.title && s.concepts.length);
  if (stages.length < 3) throw new Error("The AI returned too few stages");
  return {
    title: text(raw?.title, 120) || `${topic} Learning Roadmap`,
    overview: text(raw?.overview, 800),
    stages: stages.slice(0, 12),
    capstone: { title: text(raw?.capstone?.title, 100), desc: text(raw?.capstone?.desc, 600) },
  };
}

function summary(r) {
  return {
    _id: r._id,
    topic: r.topic,
    title: r.title,
    experience: r.experience,
    stageCount: r.stages.length,
    doneCount: r.stages.filter((s) => s.done).length,
    createdAt: r.createdAt,
  };
}

router.post("/", protect, async (req, res) => {
  try {
    const topic = text(req.body.topic, 60);
    const goal = text(req.body.goal, 200);
    const experience = EXPERIENCE.includes(req.body.experience) ? req.body.experience : "beginner";
    const hoursPerWeek = Math.min(Math.max(parseInt(req.body.hoursPerWeek, 10) || 5, 1), 40);
    if (topic.length < 1) return res.status(400).json({ message: "Enter the language or technology you want to learn" });

    const count = await Roadmap.countDocuments({ userId: req.user._id });
    if (count >= MAX_SAVED) return res.status(400).json({ message: `You can keep up to ${MAX_SAVED} roadmaps. Delete one to create another.` });
    const last = await Roadmap.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS) {
      return res.status(429).json({ message: "Please wait a few seconds before generating another roadmap" });
    }

    const prompt = `Create a personalised learning roadmap for someone who wants to learn "${topic}".
Learner level: ${experience}. Time available: about ${hoursPerWeek} hours per week.${goal ? ` Their goal: ${goal}.` : ""}
If "${topic}" is not a real programming language, framework or technology, still return the JSON but base it on the closest real programming topic.

Make 6 to 10 stages in the order they should be learned. For each stage give:
- "title" and "duration" (e.g. "Week 1-2", based on the hours per week)
- "concepts": 3-6 concepts to learn
- "exercises": 2-4 short practice exercises
- "debugging": 1-2 debugging practice tasks (describe a typical bug to find and fix)
- "project": a small project with "title" and "desc"
Also give an "overview" (2-3 sentences) and a final "capstone" project with "title" and "desc".

Return a JSON object only, in this shape:
{"title":"...","overview":"...","stages":[{"title":"...","duration":"...","concepts":["..."],"exercises":["..."],"debugging":["..."],"project":{"title":"...","desc":"..."}}],"capstone":{"title":"...","desc":"..."}}`;

    let cleaned = null;
    for (let attempt = 0; attempt < 2 && !cleaned; attempt++) {
      try {
        cleaned = cleanRoadmap(parseAIJson(await askGroq(prompt, { maxTokens: 4000, json: true })), topic);
      } catch (err) {
        console.warn("Roadmap generation attempt failed:", err.message);
      }
    }
    if (!cleaned) return res.status(503).json({ message: "Could not generate the roadmap right now. Please try again." });

    const roadmap = await Roadmap.create({ userId: req.user._id, topic, goal, experience, hoursPerWeek, ...cleaned });
    res.status(201).json({ roadmap, builtInTrack: builtInTrackFor(topic) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ roadmaps: roadmaps.map(summary) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

async function loadOwn(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: "Invalid roadmap id" });
    return null;
  }
  const roadmap = await Roadmap.findOne({ _id: req.params.id, userId: req.user._id });
  if (!roadmap) res.status(404).json({ message: "Roadmap not found" });
  return roadmap;
}

router.get("/:id", protect, async (req, res) => {
  try {
    const roadmap = await loadOwn(req, res);
    if (roadmap) res.json({ roadmap, builtInTrack: builtInTrackFor(roadmap.topic) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Tick a stage as done / not done.
router.patch("/:id/stages/:index", protect, async (req, res) => {
  try {
    const roadmap = await loadOwn(req, res);
    if (!roadmap) return;
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || !roadmap.stages[index]) return res.status(400).json({ message: "Invalid stage" });
    roadmap.stages[index].done = !!req.body.done;
    await roadmap.save();
    res.json({ roadmap });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const roadmap = await loadOwn(req, res);
    if (!roadmap) return;
    await roadmap.deleteOne();
    res.json({ message: "Roadmap deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
