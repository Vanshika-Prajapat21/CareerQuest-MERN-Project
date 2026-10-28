const mongoose = require("mongoose");

const portfolioItemSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["certificate", "achievement", "project"],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    organization: { type: String, trim: true, maxlength: 140, default: "" },
    date: { type: Date, default: null },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    skills: { type: [String], default: [] },
    credentialUrl: { type: String, trim: true, default: "" },
    githubUrl: { type: String, trim: true, default: "" },
    demoUrl: { type: String, trim: true, default: "" },
    fileUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PortfolioItem", portfolioItemSchema);
