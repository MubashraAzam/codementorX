const express = require("express");
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");

// Module 4.1 — runs C++ and Java code through Judge0 (Python, JavaScript and
// React run inside the student's browser, so they cost nothing).
//
// Env (one of):
//   RapidAPI free plan:  JUDGE0_URL=https://judge0-ce.p.rapidapi.com
//                        JUDGE0_KEY=<RapidAPI key>  JUDGE0_HOST=judge0-ce.p.rapidapi.com
//   Self-hosted Judge0:  JUDGE0_URL=http://your-server:2358   (no key needed)
const router = express.Router();

const LANGUAGE_IDS = { cpp: 54, java: 62 }; // Judge0 CE: C++ (GCC 9.2.0), Java (OpenJDK 13)
const MAX_CODE = 50000;
const MAX_STDIN = 10000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_RUNS = Number(process.env.RUNS_PER_10_MIN) || 20; // the free Judge0 plan is ~50 runs/day
const runs = new Map();

const b64 = (s) => Buffer.from(s || "", "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

function limit(req, res, next) {
  const key = String(req.user._id);
  const now = Date.now();
  const recent = (runs.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_RUNS) {
    return res.status(429).json({ message: "Run limit reached for now. Please wait a few minutes before running C++/Java code again.", code: "RUN_LIMIT" });
  }
  recent.push(now);
  runs.set(key, recent);
  return next();
}

router.post("/run", protect, limit, async (req, res) => {
  const { language } = req.body;
  const code = typeof req.body.code === "string" ? req.body.code : "";
  const stdin = typeof req.body.stdin === "string" ? req.body.stdin.slice(0, MAX_STDIN) : "";
  if (!LANGUAGE_IDS[language]) {
    return res.status(400).json({ message: "Only C++ and Java run on the server. Python, JavaScript and React run in your browser." });
  }
  if (!code.trim()) return res.status(400).json({ message: "Write some code first" });
  if (code.length > MAX_CODE) return res.status(413).json({ message: "Code is too long" });
  if (!process.env.JUDGE0_URL) {
    return res.status(503).json({ message: "The C++/Java runner is not set up yet (JUDGE0_URL is missing on the server).", code: "RUNNER_NOT_CONFIGURED" });
  }

  try {
    const headers = { "Content-Type": "application/json" };
    if (process.env.JUDGE0_KEY) {
      headers["X-RapidAPI-Key"] = process.env.JUDGE0_KEY;
      headers["X-RapidAPI-Host"] = process.env.JUDGE0_HOST || new URL(process.env.JUDGE0_URL).host;
    }
    const url = `${process.env.JUDGE0_URL.replace(/\/$/, "")}/submissions?base64_encoded=true&wait=true`;
    const { data } = await axios.post(url, {
      source_code: b64(code),
      language_id: LANGUAGE_IDS[language],
      stdin: b64(stdin),
      cpu_time_limit: 5,
      wall_time_limit: 10,
      memory_limit: 128000,
    }, { headers, timeout: 30000 });

    const statusId = data?.status?.id;
    res.json({
      status: data?.status?.description || "Unknown",
      ok: statusId === 3, // 3 = Accepted (ran without errors)
      stdout: unb64(data?.stdout),
      stderr: unb64(data?.stderr),
      compileOutput: unb64(data?.compile_output),
      time: data?.time ? Number(data.time) : null,
      memory: data?.memory ?? null,
    });
  } catch (err) {
    const status = err.response?.status;
    console.error("[code-run]", status, err.response?.data || err.message);
    if (status === 429) return res.status(429).json({ message: "The code runner's daily free limit is used up. Try again later.", code: "RUNNER_QUOTA" });
    res.status(502).json({ message: "The code runner is not responding. Please try again." });
  }
});

module.exports = router;
