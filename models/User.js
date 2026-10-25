const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    language:   { type: String, enum: ["python", "cpp"], required: true },
    enrolledAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true, trim: true, minlength: 3 },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 8 },
  firstName: { type: String, default: "" },
  lastName:  { type: String, default: "" },
  dob:       { type: String, default: "" },
  contact:   { type: String, default: "" },
  avatarUrl: { type: String, default: "" },

  // Module 1.3 — multi-course enrollment. `language` is the course currently
  // open on the dashboard; `enrollments` is every course the user has joined.
  language:    { type: String, enum: ["python", "cpp", null], default: null },
  enrollments: { type: [enrollmentSchema], default: [] },

  // Module 11 groundwork — admins get access to the admin panel routes.
  role: { type: String, enum: ["student", "admin"], default: "student" },

  // Module 1.1 — email verification. Only a hash of the emailed token is stored.
  emailVerified:       { type: Boolean, default: false },
  emailVerifyHash:     { type: String, default: null },
  emailVerifyExpires:  { type: Date, default: null },
  emailVerifySentAt:   { type: Date, default: null },

  // Module 1.4 — bumped on logout and password change so older tokens stop working.
  tokenVersion: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
