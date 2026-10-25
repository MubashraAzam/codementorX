const express = require("express");
const Progress = require("../models/Progress");
const Certificate = require("../models/Certificate");
const { protect } = require("../middleware/authMiddleware");
const { validateLanguage } = require("../middleware/validateLanguage");

const router = express.Router();

// Progress is read-only from the client's point of view. Levels are recorded by
// /api/assessment when a quiz is graded, projects by /api/ai/review-project,
// and the viva by the Dograh webhook — never by values the browser sends.

router.get("/:language", protect, validateLanguage, async (req, res) => {
  try {
    let progress = await Progress.findOne({ userId: req.user._id, language: req.params.language });
    if (!progress) progress = await Progress.create({ userId: req.user._id, language: req.params.language });
    const cert = await Certificate.findOne({ userId: req.user._id, language: req.params.language });
    res.json({
      doneLevels: progress.doneLevels,
      stars: Object.fromEntries(progress.stars),
      currentLevel: progress.currentLevel,
      solvedProjects: Object.fromEntries(progress.solvedProjects),
      interview: progress.interview,
      levelReports: Object.fromEntries(progress.levelReports || []),
      certificate: cert || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/:language", protect, validateLanguage, async (req, res) => {
  try {
    await Progress.findOneAndDelete({ userId: req.user._id, language: req.params.language });
    res.json({ message: "Progress reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
