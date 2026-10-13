export const TYPES = ["Internship", "Job", "Hackathon", "Coding Competition", "Scholarship", "Workshop", "Certification", "Event"];
export const MODES = ["Online", "Offline", "Hybrid"];
export const STATUSES = ["Interested", "Applied", "Shortlisted", "Rejected", "Selected"];

export const TYPE_ICONS = {
  Internship: "🎓", Job: "💼", Hackathon: "🚀", "Coding Competition": "🏆",
  Scholarship: "💰", Workshop: "🛠️", Certification: "📜", Event: "🎉",
};

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Whole days between today and the deadline
export const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

export const deadlineText = (d) => {
  const n = daysLeft(d);
  if (n < 0) return "Expired";
  if (n === 0) return "Closes today";
  return `${n} day${n === 1 ? "" : "s"} left`;
};

export const toList = (text) => text.split(",").map((s) => s.trim()).filter(Boolean);
