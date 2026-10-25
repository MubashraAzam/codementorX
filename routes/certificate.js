const express = require("express");
const Progress = require("../models/Progress");
const Certificate = require("../models/Certificate");
const { protect, requireEnrollment } = require("../middleware/authMiddleware");
const { validateLanguage } = require("../middleware/validateLanguage");
const { certificateBlockers, solvedProjectCount } = require("../utils/progressRules");

const router = express.Router();

router.post("/:language/issue", protect, validateLanguage, requireEnrollment(), async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user._id, language: req.params.language });
    if (!progress) return res.status(400).json({ message: "No progress found" });

    const blockers = certificateBlockers(progress);
    if (blockers.length) return res.status(400).json({ message: blockers[0], blockers });
    const solvedCount = solvedProjectCount(progress);
    // The certificate shows the student's email, so it must be a verified one.
    if (!req.user.emailVerified) {
      return res.status(403).json({ message: "Verify your email address before claiming the certificate", code: "EMAIL_NOT_VERIFIED" });
    }

    let cert = await Certificate.findOne({ userId: req.user._id, language: req.params.language });
    if (!cert) {
      cert = await Certificate.create({
        userId: req.user._id,
        language: req.params.language,
        projectsSolved: solvedCount,
        interviewScore: progress.interview.percentage,
      });
    }
    res.json(cert);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:language", protect, validateLanguage, async (req, res) => {
  try {
    const cert = await Certificate.findOne({ userId: req.user._id, language: req.params.language });
    if (!cert) return res.status(404).json({ message: "No certificate yet" });
    res.json(cert);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Public verification route for QR code scans
router.get("/verify/:certificateNumber", async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateNumber: req.params.certificateNumber }).populate(
      "userId",
      "username firstName lastName email contact createdAt"
    );
    if (!cert) {
      return res.status(404).json({ message: "Certificate not found or invalid certificate ID" });
    }

    const studentName = [cert.userId?.firstName, cert.userId?.lastName].filter(Boolean).join(" ") || cert.userId?.username || "Student";

    res.json({
      valid: true,
      certificateNumber: cert.certificateNumber,
      language: cert.language,
      projectsSolved: cert.projectsSolved,
      interviewScore: cert.interviewScore,
      issuedAt: cert.issuedAt,
      student: {
        name: studentName,
        username: cert.userId?.username || "Student",
        email: cert.userId?.email || "",
        contact: cert.userId?.contact || "Not provided",
        startDate: cert.userId?.createdAt || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;