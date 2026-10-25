const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { migrateEnrollments, isEnrolled } = require("../utils/userAccount");

const protect = async (req, res, next) => {
  if (!req.headers.authorization?.startsWith("Bearer")) {
    return res.status(401).json({ message: "Not authorized, no token", code: "NO_TOKEN" });
  }
  let decoded;
  try {
    const token = req.headers.authorization.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Not authorized, token expired or invalid", code: "TOKEN_EXPIRED" });
  }
  try {
    const user = await User.findById(decoded.id).select("-password -emailVerifyHash");
    if (!user) {
      return res.status(401).json({ message: "User not found or account removed", code: "USER_NOT_FOUND" });
    }
    // Tokens issued before a logout or password change carry an old version.
    if ((decoded.tv || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: "Session ended, please log in again", code: "TOKEN_REVOKED" });
    }
    if (migrateEnrollments(user)) await user.save();
    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin-only routes (Module 11). Use after `protect`.
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required", code: "ADMIN_ONLY" });
  }
  return next();
};

// Blocks course actions for tracks the user has not enrolled in.
// `pick` reads the language from the request (route param by default).
const requireEnrollment = (pick = (req) => req.params.language) => (req, res, next) => {
  const language = pick(req);
  if (!isEnrolled(req.user, language)) {
    return res.status(403).json({ message: "Enroll in this course first", code: "NOT_ENROLLED" });
  }
  return next();
};

module.exports = { protect, adminOnly, requireEnrollment };
