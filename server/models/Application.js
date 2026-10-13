const mongoose = require("mongoose");

// Details a student types into the internal application form
const applicantSchema = new mongoose.Schema({
  fullName: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  college: { type: String, trim: true },
  education: { type: String, trim: true },
  yearSemester: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  skills: [String],
  linkedin: { type: String, default: "" },
  portfolio: { type: String, default: "" },
  whyApply: { type: String },
  experience: { type: String, default: "" },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: "Opportunity", required: true },
  // External = the student tracks an application made on the official website
  // Internal = submitted through the CareerQuest form
  type: { type: String, enum: ["External", "Internal"], default: "External" },
  status: { type: String, enum: ["Interested", "Applied", "Shortlisted", "Rejected", "Selected"], default: "Interested" },
  appliedAt: { type: Date, default: Date.now }, // submission date (Internal) or tracking date (External)
  statusUpdatedAt: { type: Date },
  applicant: applicantSchema, // Internal only
  resume: {                   // Internal only. storedName is a random server file name, never shown to users
    originalName: String,
    storedName: String,
    mimeType: String,
    size: Number,
    uploadedAt: Date,
  },
});

// An internal application must contain the applicant details and a resume
applicationSchema.pre("validate", function () {
  if (this.type !== "Internal") return;
  const a = this.applicant || {};
  ["fullName", "email", "phone", "whyApply"].forEach((f) => {
    if (!a[f]) this.invalidate(`applicant.${f}`, `${f} is required for an internal application`);
  });
  if (!this.resume || !this.resume.storedName) this.invalidate("resume", "Resume is required for an internal application");
});

// One application per student per opportunity (this is what prevents duplicates, even on double clicks)
applicationSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
module.exports = mongoose.model("Application", applicationSchema);
