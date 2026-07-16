const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true, trim: true, minlength: 3 },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 8 },
  firstName: { type: String, default: "" },
  lastName:  { type: String, default: "" },
  dob:       { type: String, default: "" },
  contact:   { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  language:  { type: String, enum: ["python", "cpp", null], default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);