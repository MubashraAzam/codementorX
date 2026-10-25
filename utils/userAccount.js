const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { LANGUAGES, isLanguage } = require("../data/curriculum");

// Login lasts 30 days unless JWT_EXPIRES_IN overrides it (proposal, Module 1.2).
function generateToken(user) {
  return jwt.sign({ id: user._id, tv: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

// Accounts created before multi-course enrollment only have `language`.
// Treat that course as an enrollment and record it, so old users keep working.
function migrateEnrollments(user) {
  if (user.language && !user.enrollments.some((e) => e.language === user.language)) {
    user.enrollments.push({ language: user.language, enrolledAt: user.createdAt || new Date() });
    return true;
  }
  return false;
}

function enrolledLanguages(user) {
  const set = new Set((user.enrollments || []).map((e) => e.language));
  if (user.language) set.add(user.language);
  return LANGUAGES.filter((l) => set.has(l));
}

function isEnrolled(user, language) {
  return isLanguage(language) && enrolledLanguages(user).includes(language);
}

// The one shape every auth/profile/course response returns.
function publicUser(user, { withToken = false } = {}) {
  const out = {
    _id: user._id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    dob: user.dob,
    contact: user.contact,
    avatarUrl: user.avatarUrl,
    language: user.language,
    enrollments: enrolledLanguages(user),
    role: user.role || "student",
    emailVerified: !!user.emailVerified,
    createdAt: user.createdAt,
  };
  if (withToken) out.token = generateToken(user);
  return out;
}

// Server-side copy of the registration form's password rule.
function passwordProblem(password) {
  if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be at most 128 characters.";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Use 8+ characters with upper case, lower case, a number and a special character.";
  }
  return null;
}

// Creates a fresh verification token. The raw token goes in the email link;
// only its SHA-256 hash is stored, so a database leak cannot verify accounts.
function issueEmailToken(user) {
  const raw = crypto.randomBytes(32).toString("hex");
  user.emailVerifyHash = hashToken(raw);
  user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  user.emailVerifySentAt = new Date();
  return raw;
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

module.exports = {
  generateToken,
  migrateEnrollments,
  enrolledLanguages,
  isEnrolled,
  publicUser,
  passwordProblem,
  issueEmailToken,
  hashToken,
};
