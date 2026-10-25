const express = require("express");
const mongoose = require("mongoose");
const { protect, requireEnrollment } = require("../middleware/authMiddleware");
const { validateLanguage } = require("../middleware/validateLanguage");
const { askGroq } = require("../utils/aiProviders");
const { parseAIJson } = require("../utils/aiJson");
const { LEVELS, LANG_LABEL, TOTAL_LEVELS } = require("../data/curriculum");
const { isLevelUnlocked, starsForScore } = require("../utils/progressRules");
const Progress = require("../models/Progress");
const QuizAttempt = require("../models/QuizAttempt");

const router = express.Router();

const QUESTION_COUNT = 5;

function isValidQuestion(item) {
  return (
    item &&
    typeof item.q === "string" && item.q.trim() &&
    Array.isArray(item.opts) && item.opts.length === 4 &&
    item.opts.every((o) => typeof o === "string" && o.trim()) &&
    Number.isInteger(item.ans) && item.ans >= 0 && item.ans < 4
  );
}

async function generateQuestions(language, level) {
  const prompt = `Create a quiz with exactly ${QUESTION_COUNT} multiple-choice questions for ${LANG_LABEL[language]} "${level.title}" (${level.sub}). Each question has exactly 4 options and one correct answer. Return ONLY valid JSON like: [{"q":"Question?","opts":["A","B","C","D"],"ans":0,"exp":"Why A is correct"}]. The ans field is the 0-based index of the correct option. No markdown, no extra text.`;

  // The model occasionally returns malformed JSON — try twice before giving up.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = parseAIJson(await askGroq(prompt));
      const valid = Array.isArray(parsed) ? parsed.filter(isValidQuestion) : [];
      if (valid.length >= QUESTION_COUNT) {
        return valid.slice(0, QUESTION_COUNT).map((x) => ({
          q: x.q.trim(),
          opts: x.opts.map((o) => o.trim()),
          ans: x.ans,
          exp: typeof x.exp === "string" ? x.exp : "",
        }));
      }
    } catch (err) {
      console.warn("Quiz generation attempt failed:", err.message);
    }
  }
  return null;
}

async function loadOwnAttempt(req, res) {
  const { attemptId } = req.params;
  if (!mongoose.isValidObjectId(attemptId)) {
    res.status(400).json({ message: "Invalid attempt id" });
    return null;
  }
  const attempt = await QuizAttempt.findOne({ _id: attemptId, userId: req.user._id });
  if (!attempt) {
    res.status(404).json({ message: "Quiz attempt not found" });
    return null;
  }
  return attempt;
}

// Start a new quiz for a level. Only unlocked levels can be attempted.
router.post("/:language/:levelIndex/start", protect, validateLanguage, requireEnrollment(), async (req, res) => {
  try {
    const { language } = req.params;
    const levelIndex = Number(req.params.levelIndex);
    if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= TOTAL_LEVELS) {
      return res.status(400).json({ message: "Invalid level" });
    }

    const progress = await Progress.findOne({ userId: req.user._id, language });
    if (!isLevelUnlocked(progress, levelIndex)) {
      return res.status(403).json({
        message: `Level ${levelIndex + 1} is locked. Complete level ${levelIndex} first.`,
        code: "LEVEL_LOCKED",
      });
    }

    const questions = await generateQuestions(language, LEVELS[language][levelIndex]);
    if (!questions) {
      return res.status(503).json({ message: "Could not generate the quiz right now. Please try again." });
    }

    const attempt = await QuizAttempt.create({
      userId: req.user._id,
      language,
      levelIndex,
      questions,
      answers: questions.map(() => -1),
    });

    res.status(201).json({
      attemptId: attempt._id,
      levelIndex,
      questions: questions.map(({ q, opts }) => ({ q, opts })),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Lock in one answer. Each question can be answered once; the response then
// reveals whether it was right, so the UI can show feedback immediately.
router.post("/attempt/:attemptId/answer", protect, async (req, res) => {
  try {
    const attempt = await loadOwnAttempt(req, res);
    if (!attempt) return;
    if (attempt.status !== "active") return res.status(409).json({ message: "This quiz is already finished" });

    const index = Number(req.body.index);
    const choice = Number(req.body.choice);
    const question = attempt.questions[index];
    if (!Number.isInteger(index) || !question) return res.status(400).json({ message: "Invalid question index" });
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.opts.length) {
      return res.status(400).json({ message: "Invalid option" });
    }

    if (attempt.answers[index] === -1) {
      attempt.answers.set(index, choice);
      await attempt.save();
    }
    const locked = attempt.answers[index];

    res.json({
      index,
      choice: locked,
      correct: locked === question.ans,
      correctIndex: question.ans,
      exp: question.exp,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Grade the attempt on the server and record the level result.
router.post("/attempt/:attemptId/finish", protect, async (req, res) => {
  try {
    const attempt = await loadOwnAttempt(req, res);
    if (!attempt) return;

    if (attempt.status === "active") {
      if (attempt.answers.some((a) => a === -1)) {
        return res.status(400).json({ message: "Answer every question before finishing" });
      }
      const correct = attempt.questions.filter((q, i) => attempt.answers[i] === q.ans).length;
      const score = Math.round((correct / attempt.questions.length) * 100);
      attempt.score = score;
      attempt.stars = starsForScore(score);
      attempt.status = "completed";
      attempt.completedAt = new Date();
      await attempt.save();

      if (attempt.stars > 0) {
        let progress = await Progress.findOne({ userId: req.user._id, language: attempt.language });
        if (!progress) progress = new Progress({ userId: req.user._id, language: attempt.language });
        if (!progress.doneLevels.includes(attempt.levelIndex)) progress.doneLevels.push(attempt.levelIndex);
        const prevStars = progress.stars.get(String(attempt.levelIndex)) || 0;
        if (attempt.stars > prevStars) progress.stars.set(String(attempt.levelIndex), attempt.stars);
        progress.currentLevel = Math.min(Math.max(progress.currentLevel, attempt.levelIndex + 1), TOTAL_LEVELS - 1);
        progress.updatedAt = Date.now();
        await progress.save();
      }
    }

    const progress = await Progress.findOne({ userId: req.user._id, language: attempt.language });
    const correct = attempt.questions.filter((q, i) => attempt.answers[i] === q.ans).length;
    res.json({
      score: attempt.score,
      stars: attempt.stars,
      correct,
      total: attempt.questions.length,
      levelIndex: attempt.levelIndex,
      progress: progress
        ? {
            doneLevels: progress.doneLevels,
            stars: Object.fromEntries(progress.stars),
            currentLevel: progress.currentLevel,
          }
        : { doneLevels: [], stars: {}, currentLevel: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
