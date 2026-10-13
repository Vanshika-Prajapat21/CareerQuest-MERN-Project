// Server-side validation for the internal application form and the resume file.
// Keep the rules in sync with client/src/utils/applicationForm.js.
const { getLinkStatus } = require("./url");

const maxResumeBytes = () => (Number(process.env.MAX_RESUME_MB) || 2) * 1024 * 1024;

const oneLine = (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : ""); // non-strings become "" (blocks {"$gt":""} tricks)
const multiLine = (v) => (typeof v === "string" ? v.trim() : "");

const splitList = (value) => {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const out = [];
  items.forEach((item) => {
    const t = oneLine(item);
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  });
  return out;
};

const isLinkedIn = (value) => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com");
  } catch (e) {
    return false;
  }
};

const validateApplicationForm = (body = {}) => {
  const v = {
    fullName: oneLine(body.fullName),
    email: oneLine(body.email).toLowerCase(),
    phone: oneLine(body.phone),
    college: oneLine(body.college),
    education: oneLine(body.education),
    yearSemester: oneLine(body.yearSemester),
    city: oneLine(body.city),
    state: oneLine(body.state),
    skills: splitList(body.skills),
    linkedin: oneLine(body.linkedin),
    portfolio: oneLine(body.portfolio),
    whyApply: multiLine(body.whyApply),
    experience: multiLine(body.experience),
  };
  const errors = {};

  const required = (field, label, { min = 1, max = 150 } = {}) => {
    if (!v[field]) errors[field] = `${label} is required`;
    else if (v[field].length < min) errors[field] = `${label} must be at least ${min} characters`;
    else if (v[field].length > max) errors[field] = `${label} must be at most ${max} characters`;
  };

  required("fullName", "Full name", { min: 2, max: 100 });
  required("college", "College / university", { min: 2 });
  required("education", "Education", { min: 2, max: 100 });
  required("yearSemester", "Current year / semester", { max: 50 });
  required("city", "City", { min: 2, max: 60 });
  required("state", "State", { min: 2, max: 60 });
  required("whyApply", "Why do you want to apply", { min: 20, max: 2000 });
  if (v.experience.length > 2000) errors.experience = "Projects / experience must be at most 2000 characters";

  if (!v.email) errors.email = "Email is required";
  else if (v.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = "Enter a valid email address";

  const digits = v.phone.replace(/\D/g, "");
  if (!v.phone) errors.phone = "Phone number is required";
  else if (!/^\+?[0-9\s\-()]+$/.test(v.phone) || digits.length < 10 || digits.length > 15) errors.phone = "Enter a valid phone number (10 to 15 digits)";

  if (v.skills.length === 0) errors.skills = "Add at least one skill";
  else if (v.skills.length > 30 || v.skills.some((s) => s.length > 50)) errors.skills = "Use at most 30 skills, each up to 50 characters";

  const checkLink = (field, label, linkedinOnly) => {
    if (!v[field]) return; // optional
    const status = getLinkStatus(v[field]);
    if (status !== "valid") errors[field] = `${label} must be a valid http:// or https:// link${status === "placeholder" ? " (placeholder links are not allowed)" : ""}`;
    else if (linkedinOnly && !isLinkedIn(v[field])) errors[field] = "LinkedIn URL must be a linkedin.com link";
  };
  checkLink("linkedin", "LinkedIn URL", true);
  checkLink("portfolio", "GitHub / portfolio URL", false);

  return { errors, values: v };
};

// Checks the uploaded file object (from multer memory storage). Returns an error message or null.
const validateResumeFile = (file) => {
  if (!file || !Buffer.isBuffer(file.buffer)) return "Resume (PDF) is required";
  if (file.buffer.length === 0) return "The resume file is empty";
  if (file.buffer.length > maxResumeBytes()) return `Resume must be ${maxResumeBytes() / 1024 / 1024} MB or smaller`;
  if (!/\.pdf$/i.test(file.originalname || "")) return "Resume must be a .pdf file";
  if (file.mimetype !== "application/pdf") return "Resume must be a PDF file";
  // Do not trust the file name or the browser's type: look at the real bytes
  if (file.buffer.length < 100 || file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") return "This file is not a valid PDF";
  if (!file.buffer.subarray(Math.max(0, file.buffer.length - 1024)).toString("latin1").includes("%%EOF")) return "This PDF looks incomplete or corrupted";
  return null;
};

module.exports = { validateApplicationForm, validateResumeFile, maxResumeBytes };
