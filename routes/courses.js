const express = require("express");
const User = require("../models/User");
const Progress = require("../models/Progress");
const Certificate = require("../models/Certificate");
const { protect } = require("../middleware/authMiddleware");
const { LANGUAGES, LANG_LABEL, TOTAL_LEVELS, isLanguage } = require("../data/curriculum");
const { completedLevelCount, solvedProjectCount } = require("../utils/progressRules");
const { publicUser, enrolledLanguages } = require("../utils/userAccount");

// Module 1.3 — multi-course enrollment. A user can join several tracks; each
// keeps its own progress document. `user.language` is the course currently open.
const router = express.Router();

// Every track, with the user's enrollment and progress summary for each.
router.get("/", protect, async (req, res) => {
  try {
    const enrolled = enrolledLanguages(req.user);
    const [progresses, certs] = await Promise.all([
      Progress.find({ userId: req.user._id }),
      Certificate.find({ userId: req.user._id }),
    ]);
    const courses = LANGUAGES.map((language) => {
      const p = progresses.find((x) => x.language === language);
      const enrollment = req.user.enrollments.find((e) => e.language === language);
      return {
        language,
        label: LANG_LABEL[language],
        totalLevels: TOTAL_LEVELS,
        enrolled: enrolled.includes(language),
        enrolledAt: enrollment?.enrolledAt || null,
        levelsDone: completedLevelCount(p),
        projectsSolved: solvedProjectCount(p),
        interviewPassed: !!p?.interview?.passed,
        certificateNumber: certs.find((c) => c.language === language)?.certificateNumber || null,
      };
    });
    res.json({ active: req.user.language, courses });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Join a course (or reopen one already joined) and make it the active course.
router.post("/enroll", protect, async (req, res) => {
  try {
    const { language } = req.body;
    if (!isLanguage(language)) return res.status(400).json({ message: "Unknown course" });
    const user = await User.findById(req.user._id);
    if (!user.enrollments.some((e) => e.language === language)) user.enrollments.push({ language });
    user.language = language;
    await user.save();
    res.json(publicUser(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Switch the dashboard to another enrolled course.
router.put("/active", protect, async (req, res) => {
  try {
    const { language } = req.body;
    if (!enrolledLanguages(req.user).includes(language)) {
      return res.status(403).json({ message: "Enroll in this course first", code: "NOT_ENROLLED" });
    }
    const user = await User.findById(req.user._id);
    user.language = language;
    await user.save();
    res.json(publicUser(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Leave a course. Its progress is kept, so re-enrolling continues where they stopped.
router.delete("/:language", protect, async (req, res) => {
  try {
    const { language } = req.params;
    if (!isLanguage(language)) return res.status(400).json({ message: "Unknown course" });
    const user = await User.findById(req.user._id);
    user.enrollments = user.enrollments.filter((e) => e.language !== language);
    if (user.language === language) user.language = user.enrollments[0]?.language || null;
    await user.save();
    res.json(publicUser(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
