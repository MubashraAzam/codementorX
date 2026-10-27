// Simple per-user limit on AI requests, so one account cannot exhaust the
// shared free AI quota. In memory: resets when the server restarts, which is
// fine for a single Render instance.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.AI_REQUESTS_PER_10_MIN) || 60;
const hits = new Map(); // userId -> [timestamps]

function aiRateLimit(req, res, next) {
  const key = String(req.user?._id || req.ip);
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    const waitSec = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    return res.status(429).json({ message: `Too many AI requests. Please wait ${Math.ceil(waitSec / 60)} minute(s).`, code: "AI_RATE_LIMIT" });
  }
  recent.push(now);
  hits.set(key, recent);
  return next();
}

module.exports = { aiRateLimit };
