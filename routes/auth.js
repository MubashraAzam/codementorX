const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const generateToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

router.post("/register", [
  body("username").trim().isLength({ min: 3 }),
  body("email").isEmail(),
  body("password").isLength({ min: 8 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, email, password } = req.body;
  try {
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const user = await User.create({ username, email, password: hashed });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      dob: user.dob,
      contact: user.contact,
      avatarUrl: user.avatarUrl,
      language: user.language,
      createdAt: user.createdAt,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", [
  body("username").trim().notEmpty(),
  body("password").notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      dob: user.dob,
      contact: user.contact,
      avatarUrl: user.avatarUrl,
      language: user.language,
      createdAt: user.createdAt,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/me", protect, async (req, res) => res.json(req.user));

router.put("/profile", protect, async (req, res) => {
  try {
    // findById (unlike req.user) includes the password hash, needed to verify a password change
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      firstName, lastName, email, username, dob, contact,
      avatarUrl, currentPassword, newPassword, language,
    } = req.body;

    if (username && username !== user.username) {
      const trimmed = username.trim();
      if (trimmed.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters" });
      const existingUser = await User.findOne({ username: trimmed });
      if (existingUser) return res.status(400).json({ message: "Username is already taken" });
      user.username = trimmed;
    }

    if (email && email !== user.email) {
      const normalized = email.toLowerCase().trim();
      const existingEmail = await User.findOne({ email: normalized });
      if (existingEmail) return res.status(400).json({ message: "Email is already in use" });
      user.email = normalized;
    }

    // Optional profile fields — checked against undefined so they can be cleared to ""
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName  !== undefined) user.lastName  = lastName;
    if (dob       !== undefined) user.dob       = dob;
    if (contact   !== undefined) user.contact   = contact;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (language)  user.language  = language;

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: "Current password is required to set a new password" });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(400).json({ message: "Current password is incorrect" });
      if (newPassword.length < 8) return res.status(400).json({ message: "New password must be at least 8 characters" });
      user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    }

    const updated = await user.save();
    res.json({
      _id: updated._id,
      username: updated.username,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      dob: updated.dob,
      contact: updated.contact,
      avatarUrl: updated.avatarUrl,
      language: updated.language,
      createdAt: updated.createdAt,
      token: generateToken(updated._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;