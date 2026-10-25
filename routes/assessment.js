const express = require("express");
const crypto = require("crypto");
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

// Module 2.2 — every level assessment has 10 questions in three formats.
const QUESTION_COUNT = 10;
const TYPE_MIX = { concept: 4, output: 3, debug: 3 };
const TYPE_LABEL = { concept: "Concepts", output: "Predict the output", debug: "Debugging" };

function isValidQuestion(item) {
  const typeOk = ["concept", "output", "debug"].includes(item?.type);
  const needsCode = item?.type === "output" || item?.type === "debug";
  return (
    item && typeOk &&
    typeof item.q === "string" && item.q.trim() &&
    (!needsCode || (typeof item.code === "string" && item.code.trim())) &&
    Array.isArray(item.opts) && item.opts.length === 4 &&
    item.opts.every((o) => typeof o === "string" && o.trim()) &&
    new Set(item.opts.map((o) => o.trim())).size === 4 &&
    Number.isInteger(item.ans) && item.ans >= 0 && item.ans < 4
  );
}

// Models tend to put the right answer first; shuffle so its position is random.
function shuffleOptions(item) {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { opts: order.map((i) => item.opts[i].trim()), ans: order.indexOf(item.ans) };
}

function pickMix(valid) {
  // Take up to the target count of each type, then fill any gap with the rest.
  const chosen = [];
  for (const [type, n] of Object.entries(TYPE_MIX)) {
    chosen.push(...valid.filter((x) => x.type === type).slice(0, n));
  }
  for (const x of valid) {
    if (chosen.length >= QUESTION_COUNT) break;
    if (!chosen.includes(x)) chosen.push(x);
  }
  return chosen.slice(0, QUESTION_COUNT);
}

async function generateQuestions(language, level) {
  const topics = level.sub.split("·").map((t) => t.trim()).filter(Boolean);
  const prompt = `You are writing a level assessment for a ${LANG_LABEL[language]} course.
Level: "${level.title}". Topics: ${topics.join(", ")}.

Write exactly ${QUESTION_COUNT} multiple-choice questions:
- ${TYPE_MIX.concept} of type "concept": test understanding of a concept (no code needed, "code" may be "").
- ${TYPE_MIX.output} of type "output": show a short ${LANG_LABEL[language]} snippet in "code" and ask what it prints/returns/renders.
- ${TYPE_MIX.debug} of type "debug": show a short snippet with ONE bug in "code" and ask what the bug is or which fix is correct.

Rules: each question has exactly 4 different options and exactly one correct answer; "ans" is the 0-based index of the correct option; "topic" is one of the topics listed above; keep code under 12 lines; "exp" briefly explains the correct answer. Make sure the correct answer really is correct.

Return a JSON object only, in this shape:
{"questions":[{"type":"output","topic":"${topics[0] || level.title}","q":"What does this print?","code":"...","opts":["A","B","C","D"],"ans":2,"exp":"..."}]}`;

  // The model occasionally returns malformed or short JSON — try twice.
  let best = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = parseAIJson(await askGroq(prompt, { maxTokens: 4000, json: true }));
      const list = Array.isArray(parsed) ? parsed : parsed?.questions;
      const valid = Array.isArray(list) ? list.filter(isValidQuestion) : [];
      if (valid.length > best.length) best = valid;
      const hasEveryType = Object.keys(TYPE_MIX).every((t) => valid.some((x) => x.type === t));
      if (valid.length >= QUESTION_COUNT && hasEveryType) break;
    } catch (err) {
      console.warn("Assessment generation attempt failed:", err.message);
    }
  }
  if (best.length < QUESTION_COUNT) return null;

  return pickMix(best).map((x) => ({
    type: x.type,
    topic: typeof x.topic === "string" && x.topic.trim() ? x.topic.trim().slice(0, 60) : level.title,
    code: typeof x.code === "string" ? x.code.slice(0, 1500) : "",
    q: x.q.trim(),
    ...shuffleOptions(x),
    exp: typeof x.exp === "string" ? x.exp : "",
  }));
}

// Topic-wise and type-wise breakdown of one graded attempt.
function buildReport(attempt) {
  const byType = {};
  const byTopic = {};
  attempt.questions.forEach((q, i) => {
    const ok = attempt.answers[i] === q.ans ? 1 : 0;
    const t = (byType[q.type] ||= { label: TYPE_LABEL[q.type] || q.type, correct: 0, total: 0 });
    t.correct += ok; t.total += 1;
    const key = q.topic || "General";
    const tp = (byTopic[key] ||= { correct: 0, total: 0 });
    tp.correct += ok; tp.total += 1;
  });
  const weakTopics = Object.entries(byTopic)
    .filter(([, v]) => v.correct / v.total < 0.6)
    .map(([topic]) => topic);
  return { score: attempt.score, stars: attempt.stars, byType, byTopic, weakTopics, at: new Date() };
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
      questions: questions.map(({ type, topic, code, q, opts }) => ({ type, topic, code, q, opts })),
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
      attempt.report = buildReport(attempt);
      attempt.markModified("report");
      await attempt.save();

      // Keep the latest report for every level, passed or not, so weak topics show up.
      let reportProgress = await Progress.findOne({ userId: req.user._id, language: attempt.language });
      if (!reportProgress) reportProgress = new Progress({ userId: req.user._id, language: attempt.language });
      reportProgress.levelReports.set(String(attempt.levelIndex), attempt.report);
      await reportProgress.save();

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
      report: attempt.report,
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
