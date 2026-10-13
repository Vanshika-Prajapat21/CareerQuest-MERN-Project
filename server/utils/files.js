const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Resumes are stored OUTSIDE any public folder and are only served by authenticated endpoints
const uploadDir = () => path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads", "resumes"));

// Random file name: the student's own file name is never used on disk (blocks path tricks)
const saveResume = async (buffer) => {
  await fs.promises.mkdir(uploadDir(), { recursive: true });
  const storedName = `${crypto.randomUUID()}.pdf`;
  await fs.promises.writeFile(path.join(uploadDir(), storedName), buffer, { flag: "wx" });
  return storedName;
};

// Returns the full path only for names that look exactly like ones we generated
const resumeFilePath = (storedName) =>
  typeof storedName === "string" && /^[a-f0-9-]{36}\.pdf$/.test(storedName) ? path.join(uploadDir(), storedName) : null;

const deleteResumeFile = async (storedName) => {
  const file = resumeFilePath(storedName);
  if (file) await fs.promises.unlink(file).catch(() => {});
};

// Delete applications AND their resume files (used when an opportunity or user is deleted)
const removeApplications = async (Application, filter) => {
  const apps = await Application.find(filter).select("resume");
  await Promise.all(apps.map((a) => deleteResumeFile(a.resume && a.resume.storedName)));
  await Application.deleteMany(filter);
};

module.exports = { saveResume, resumeFilePath, deleteResumeFile, removeApplications, uploadDir };
