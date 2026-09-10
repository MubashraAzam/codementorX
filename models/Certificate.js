const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  language:          { type: String, enum: ["python", "cpp"], required: true },
  projectsSolved:    { type: Number, required: true },
  interviewScore:    { type: Number, required: true },
  issuedAt:          { type: Date, default: Date.now },
  certificateNumber: { type: String, unique: true },
});

// Mongoose 9 removed the `next` callback from middleware — hooks are now
// synchronous or promise-based. Calling next() here threw "next is not a
// function" and made every Certificate.create() fail with a 500.
certificateSchema.pre("save", function () {
  if (!this.certificateNumber) {
    this.certificateNumber = `CMX-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }
});

module.exports = mongoose.model("Certificate", certificateSchema);