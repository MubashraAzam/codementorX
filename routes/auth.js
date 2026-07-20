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

    res.status(201).json({ _id: user._id, username: user.username, email: user.email, token: generateToken(user._id) });
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
    res.json({ _id: user._id, username: user.username, email: user.email, language: user.language, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/me", protect, async (req, res) => res.json(req.user));

router.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { firstName, lastName, email, username, dob, contact, newPassword, language } = req.body;

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) return res.status(400).json({ message: "Username is already taken" });
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(400).json({ message: "Email is already in use" });
      user.email = email;
    }

    if (firstName) user.firstName = firstName;
    if (lastName)  user.lastName  = lastName;
    if (dob)       user.dob       = dob;
    if (contact)   user.contact   = contact;
    if (language)  user.language  = language;
    if (newPassword) user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));

    const updated = await user.save();
    res.json({ _id: updated._id, username: updated.username, email: updated.email, language: updated.language, token: generateToken(updated._id) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;