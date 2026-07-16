const express = require("express");
const Progress = require("../models/Progress");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:language", protect, async (req, res) => {
  try {
    let progress = await Progress.findOne({ userId: req.user._id, language: req.params.language });
    if (!progress) progress = await Progress.create({ userId: req.user._id, language: req.params.language });
    res.json({
      doneLevels: progress.doneLevels,
      stars: Object.fromEntries(progress.stars),
      currentLevel: progress.currentLevel,
      solvedProjects: Object.fromEntries(progress.solvedProjects),
      interview: progress.interview,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:language/level", protect, async (req, res) => {
  const { levelIndex, stars } = req.body;
  try {
    let progress = await Progress.findOne({ userId: req.user._id, language: req.params.language });
    if (!progress) progress = new Progress({ userId: req.user._id, language: req.params.language });

    if (!progress.doneLevels.includes(levelIndex)) progress.doneLevels.push(levelIndex);
    progress.stars.set(String(levelIndex), stars);
    progress.currentLevel = Math.min(Math.max(progress.currentLevel, levelIndex + 1), 19);
    progress.updatedAt = Date.now();
    await progress.save();

    res.json({ doneLevels: progress.doneLevels, stars: Object.fromEntries(progress.stars), currentLevel: progress.currentLevel });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:language/project", protect, async (req, res) => {
  const { projectId, stars, feedback, fileName } = req.body;
  try {
    let progress = await Progress.findOne({ userId: req.user._id, language: req.params.language });
    if (!progress) progress = new Progress({ userId: req.user._id, language: req.params.language });

    progress.solvedProjects.set(String(projectId), { stars, feedback, fileName });
    await progress.save();

    res.json({ solvedProjects: Object.fromEntries(progress.solvedProjects) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:language/interview", protect, async (req, res) => {
  const { percentage, feedback } = req.body;
  try {
    let progress = await Progress.findOne({ userId: req.user._id, language: req.params.language });
    if (!progress) progress = new Progress({ userId: req.user._id, language: req.params.language });

    progress.interview = { percentage, feedback, passed: percentage >= 85 };
    await progress.save();

    res.json({ interview: progress.interview });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;