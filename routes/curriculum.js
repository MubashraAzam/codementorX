const express = require("express");
const { LANGUAGES, LEVELS, PROJECTS, RULES, trackSummary } = require("../data/curriculum");
const { validateLanguage } = require("../middleware/validateLanguage");

// Module 2.1 — the course catalogue. Public (no login), so the track picker and
// level pages read titles from one place instead of hardcoding them.
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ tracks: LANGUAGES.map(trackSummary), rules: RULES });
});

router.get("/:language", validateLanguage, (req, res) => {
  const { language } = req.params;
  res.json({
    ...trackSummary(language),
    levels: LEVELS[language].map((l, index) => ({ index, ...l })),
    projects: PROJECTS[language],
    rules: RULES,
  });
});

module.exports = router;
