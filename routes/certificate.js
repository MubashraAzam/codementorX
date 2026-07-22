const express = require("express");
const Progress = require("../models/Progress");
const Certificate = require("../models/Certificate");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/:language/issue", protect, async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user._id, language: req.params.language });
    if (!progress) return res.status(400).json({ message: "No progress found" });

    const solvedCount = [...progress.solvedProjects.values()].filter(p => p.stars >= 2).length;

    if (progress.doneLevels.length < 20) return res.status(400).json({ message: "Complete all 20 levels first" });
    if (solvedCount < 5) return res.status(400).json({ message: "Solve at least 5 projects first" });
    if (!progress.interview.passed) return res.status(400).json({ message: "Pass the interview first (75%+)" });

    let cert = await Certificate.findOne({ userId: req.user._id, language: req.params.language });
    if (!cert) {
      cert = await Certificate.create({
        userId: req.user._id,
        language: req.params.language,
        projectsSolved: solvedCount,
        interviewScore: progress.interview.percentage,
      });
    }
    res.json(cert);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:language", protect, async (req, res) => {
  const cert = await Certificate.findOne({ userId: req.user._id, language: req.params.language });
  if (!cert) return res.status(404).json({ message: "No certificate yet" });
  res.json(cert);
});

module.exports = router;