const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { sendVerificationEmail } = require("../utils/mailer");
const { isLanguage } = require("../data/curriculum");
const {
  publicUser,
  passwordProblem,
  issueEmailToken,
  hashToken,
  migrateEnrollments,
} = require("../utils/userAccount");

const router = express.Router();

const RESEND_COOLDOWN_MS = 60 * 1000;

// Never let a mail failure break sign-up or profile updates.
async function trySendVerification(user, rawToken) {
  try {
    await sendVerificationEmail(user, rawToken);
  } catch (err) {
    console.error("Verification email failed:", err.message);
  }
}

// ── 1.1 Registration ─────────────────────────────────────────────────────
router.post("/register", [
  body("username").trim().isLength({ min: 3, max: 30 }).withMessage("Username must be 3–30 characters"),
  body("email").trim().isEmail().withMessage("Enter a valid email address"),
  body("password").isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const username = req.body.username.trim();
  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  const problem = passwordProblem(password);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ message: exists.email === email ? "Email is already registered" : "Username is already taken" });
    }

    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const user = new User({ username, email, password: hashed });
    const rawToken = issueEmailToken(user);
    await user.save();
    await trySendVerification(user, rawToken);

    res.status(201).json(publicUser(user, { withToken: true }));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ── 1.2 Login (username or email) ───────────────────────────────────────
router.post("/login", [
  body("username").trim().notEmpty(),
  body("password").notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const login = req.body.username.trim();
  const { password } = req.body;
  try {
    const query = login.includes("@") ? { email: login.toLowerCase() } : { username: login };
    const user = await User.findOne(query);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    if (migrateEnrollments(user)) await user.save();
    res.json(publicUser(user, { withToken: true }));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/me", protect, async (req, res) => res.json(publicUser(req.user)));

// ── 1.4 Logout: ends every session for this account on the server ───────
router.post("/logout", protect, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    res.json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ── 1.1 Email verification ───────────────────────────────────────────────
router.post("/verify-email", async (req, res) => {
  try {
    const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: "Invalid verification link" });

    const user = await User.findOne({ emailVerifyHash: hashToken(token) });
    if (!user) return res.status(400).json({ message: "This verification link is invalid or was already used" });
    if (!user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
      return res.status(400).json({ message: "This verification link has expired. Request a new one from your dashboard.", code: "LINK_EXPIRED" });
    }

    user.emailVerified = true;
    user.emailVerifyHash = null;
    user.emailVerifyExpires = null;
    await user.save();
    res.json({ message: "Email verified", email: user.email });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/resend-verification", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.emailVerified) return res.json({ message: "Email is already verified" });
    if (user.emailVerifySentAt && Date.now() - user.emailVerifySentAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: "Please wait a minute before requesting another email" });
    }
    const rawToken = issueEmailToken(user);
    await user.save();
    await trySendVerification(user, rawToken);
    res.json({ message: `Verification email sent to ${user.email}` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ── 1.3 Profile ──────────────────────────────────────────────────────────
router.put("/profile", protect, async (req, res) => {
  try {
    // findById (unlike req.user) includes the password hash, needed to verify a password change
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      firstName, lastName, email, username, dob, contact,
      avatarUrl, currentPassword, newPassword, language,
    } = req.body;

    if (username && username.trim() !== user.username) {
      const trimmed = username.trim();
      if (trimmed.length < 3 || trimmed.length > 30) return res.status(400).json({ message: "Username must be 3–30 characters" });
      const existingUser = await User.findOne({ username: trimmed });
      if (existingUser) return res.status(400).json({ message: "Username is already taken" });
      user.username = trimmed;
    }

    let emailChanged = false;
    if (email && email.toLowerCase().trim() !== user.email) {
      const normalized = email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return res.status(400).json({ message: "Enter a valid email address" });
      const existingEmail = await User.findOne({ email: normalized });
      if (existingEmail) return res.status(400).json({ message: "Email is already in use" });
      user.email = normalized;
      user.emailVerified = false; // a new address has to be verified again
      emailChanged = true;
    }

    // Optional profile fields — checked against undefined so they can be cleared to ""
    if (firstName !== undefined) user.firstName = String(firstName).slice(0, 60);
    if (lastName  !== undefined) user.lastName  = String(lastName).slice(0, 60);
    if (dob       !== undefined) user.dob       = String(dob).slice(0, 20);
    if (contact   !== undefined) user.contact   = String(contact).slice(0, 30);
    if (avatarUrl !== undefined) {
      if (avatarUrl && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(avatarUrl)) {
        return res.status(400).json({ message: "Avatar must be an uploaded image" });
      }
      if (avatarUrl.length > 400000) return res.status(400).json({ message: "Avatar image is too large" });
      user.avatarUrl = avatarUrl;
    }

    // Kept for older clients: choosing a language here also enrolls in it.
    if (language) {
      if (!isLanguage(language)) return res.status(400).json({ message: "Unknown course" });
      if (!user.enrollments.some((e) => e.language === language)) user.enrollments.push({ language });
      user.language = language;
    }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: "Current password is required to set a new password" });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(400).json({ message: "Current password is incorrect" });
      const problem = passwordProblem(newPassword);
      if (problem) return res.status(400).json({ message: problem });
      user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
      user.tokenVersion = (user.tokenVersion || 0) + 1; // sign out other devices
    }

    let rawToken = null;
    if (emailChanged) rawToken = issueEmailToken(user);

    const updated = await user.save();
    if (rawToken) await trySendVerification(updated, rawToken);

    // A fresh token is returned; after a password change the old one no longer works.
    res.json(publicUser(updated, { withToken: true }));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
