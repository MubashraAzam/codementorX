const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  language:          { type: String, enum: ["python", "cpp"], required: true },
  projectsSolved:    { type: Number, required: true },
  interviewScore:    { type: Number, required: true },
  issuedAt:          { type: Date, default: Date.now },
  certificateNumber: { type: String, unique: true },
});

certificateSchema.pre("save", function (next) {
  if (!this.certificateNumber) {
    this.certificateNumber = `CMX-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model("Certificate", certificateSchema);