import { getLinkStatus } from "./url.js";

export const MAX_RESUME_MB = 2;

const oneLine = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
const multiLine = (v) => String(v ?? "").trim();

export const splitList = (value) => {
  const out = [];
  String(value ?? "").split(",").forEach((item) => {
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

// Returns an object of { fieldName: "message" }. Empty object = valid.
export const validateApplicationForm = (form) => {
  const v = {
    fullName: oneLine(form.fullName), email: oneLine(form.email).toLowerCase(), phone: oneLine(form.phone),
    college: oneLine(form.college), education: oneLine(form.education), yearSemester: oneLine(form.yearSemester),
    city: oneLine(form.city), state: oneLine(form.state), skills: splitList(form.skills),
    linkedin: oneLine(form.linkedin), portfolio: oneLine(form.portfolio),
    whyApply: multiLine(form.whyApply), experience: multiLine(form.experience),
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
    if (!v[field]) return;
    const status = getLinkStatus(v[field]);
    if (status !== "valid") errors[field] = `${label} must be a valid http:// or https:// link${status === "placeholder" ? " (placeholder links are not allowed)" : ""}`;
    else if (linkedinOnly && !isLinkedIn(v[field])) errors[field] = "LinkedIn URL must be a linkedin.com link";
  };
  checkLink("linkedin", "LinkedIn URL", true);
  checkLink("portfolio", "GitHub / portfolio URL", false);
  return errors;
};

// Returns an error message or "" (also peeks at the real file bytes, not just the name)
export const validateResumeFile = async (file) => {
  if (!file) return "Resume (PDF) is required";
  if (file.size === 0) return "The resume file is empty";
  if (file.size > MAX_RESUME_MB * 1024 * 1024) return `Resume must be ${MAX_RESUME_MB} MB or smaller`;
  if (!/\.pdf$/i.test(file.name || "")) return "Resume must be a .pdf file";
  if (file.type !== "application/pdf") return "Resume must be a PDF file";
  const head = await file.slice(0, 5).text();
  if (head !== "%PDF-") return "This file is not a valid PDF";
  return "";
};

// Saves a downloaded file (resume) from an API blob
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
