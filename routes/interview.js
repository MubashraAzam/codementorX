const express = require("express");
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");
const { askGroq } = require("../utils/aiProviders");
const Progress = require("../models/Progress");
const InterviewRun = require("../models/InterviewRun");

const router = express.Router();

// STEP 1 — Frontend calls this to get what it needs to start a Dograh call.
// Dograh's widget doesn't accept custom variables at call start, so we only
// hand back the agent to load and a display name for the UI.
router.get("/start/:language", protect, async (req, res) => {
  const language = req.params.language; // 'python' or 'cpp'
  const userName = req.user.firstName || req.user.username || "Student";
  const agentId = language === "python" ? process.env.DOGRAH_PYTHON_AGENT_ID : process.env.DOGRAH_CPP_AGENT_ID;

  res.json({ agentId, language, userName });
});

// STEP 2 — Frontend calls this once the widget's onCallConnected fires with a
// workflowRunId, so we can link that run to the logged-in user server-side.
router.post("/link/:language", protect, async (req, res) => {
  const { workflowRunId } = req.body;
  const language = req.params.language;

  if (!workflowRunId) {
    return res.status(400).json({ message: "Missing workflowRunId" });
  }

  await InterviewRun.findOneAndUpdate(
    { workflowRunId },
    { workflowRunId, userId: req.user._id, language, status: "started" },
    { upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ linked: true });
});

// STEP 3 — Dograh calls this automatically when the interview call ends.
router.post("/webhook", async (req, res) => {
  try {
    const secret = req.headers["x-webhook-secret"];
    if (!secret || secret !== process.env.DOGRAH_WEBHOOK_SECRET) {
      return res.status(401).json({ message: "Invalid webhook secret" });
    }

    const { run_id, transcript_url } = req.body;
    if (!run_id || !transcript_url) {
      return res.status(400).json({ message: "Missing run_id or transcript_url" });
    }

    // userId/language come only from our own record of the linked run, never
    // from the webhook body — the run_id is the only thing we trust Dograh for.
    const run = await InterviewRun.findOne({ workflowRunId: run_id });
    if (!run) {
      return res.status(404).json({ message: "Interview run not found" });
    }
    const { userId, language } = run;

    const transcriptRes = await axios.get(transcript_url);
    const transcript = typeof transcriptRes.data === "string" ? transcriptRes.data : JSON.stringify(transcriptRes.data);

    const prompt = `Grade this technical interview transcript for a ${language} student:\n\n${transcript}\n\nReturn ONLY JSON: {"percentage": 0-100, "feedback": "2-3 sentences"}.`;
    const text = await askGroq(prompt);
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());

    let progress = await Progress.findOne({ userId, language });
    if (!progress) progress = new Progress({ userId, language });

    progress.interview = {
      percentage: result.percentage,
      feedback: result.feedback,
      passed: result.percentage >= 85,
    };
    await progress.save();

    run.status = "completed";
    await run.save();

    res.json({ received: true, run_id, result });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Webhook error", error: error.message });
  }
});

// STEP 4 — Frontend polls this while waiting for the webhook to finish grading.
router.get("/progress/:language", protect, async (req, res) => {
  const progress = await Progress.findOne({ userId: req.user._id, language: req.params.language });
  res.json(progress || {});
});

module.exports = router;
