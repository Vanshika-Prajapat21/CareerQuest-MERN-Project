const mongoose = require("mongoose");
const { getLinkStatus } = require("../utils/url");

const TYPES = ["Internship", "Job", "Hackathon", "Coding Competition", "Scholarship", "Workshop", "Certification", "Event"];

const opportunitySchema = new mongoose.Schema({
  title: { type: String, required: [true, "Title is required"], trim: true },
  description: { type: String, required: [true, "Description is required"] },
  type: { type: String, enum: TYPES, required: [true, "Type is required"] },
  organization: { type: String, required: [true, "Organization is required"], trim: true },
  skills: [String],
  eligibility: { type: String, default: "" },
  education: [String], // ["MCA","BCA"] or ["Any"]
  location: { type: String, default: "Remote" },
  mode: { type: String, enum: ["Online", "Offline", "Hybrid"], default: "Online" },
  stipend: { type: String, default: "" },
  salary: { type: String, default: "" },
  deadline: { type: Date, required: [true, "Deadline is required"] },
  // Optional: leave empty when no verified link exists. If filled, it must be a real http(s) URL.
  applicationLink: {
    type: String,
    default: "",
    trim: true,
    validate: {
      validator: (v) => !v || getLinkStatus(v) === "valid",
      message: "Application link must be a real http:// or https:// URL (placeholder domains like example.com are not allowed)",
    },
  },
  logo: { type: String, default: "" },
  category: { type: String, default: "General" },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "expired"], default: "active" },
});

opportunitySchema.statics.TYPES = TYPES;
module.exports = mongoose.model("Opportunity", opportunitySchema);
