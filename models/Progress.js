const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  language:       { type: String, enum: ["python", "cpp"], required: true },
  doneLevels:     { type: [Number], default: [] },
  stars:          { type: Map, of: Number, default: {} },
  currentLevel:   { type: Number, default: 0 },
  solvedProjects: {
    type: Map,
    of: new mongoose.Schema({ stars: Number, feedback: String, fileName: String }, { _id: false }),
    default: {},
  },
  interview: {
    percentage: { type: Number, default: null },
    feedback:   { type: String, default: "" },
    passed:     { type: Boolean, default: false },
  },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Progress", progressSchema);