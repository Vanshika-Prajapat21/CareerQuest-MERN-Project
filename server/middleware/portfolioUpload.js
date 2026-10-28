const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "..", "uploads", "portfolio");
fs.mkdirSync(uploadDir, { recursive: true });
const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const uploadPortfolioFile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) return cb(Object.assign(new Error("Only PDF, JPG, PNG, or WEBP files are allowed"), { status: 400 }));
    cb(null, true);
  },
}).single("file");
module.exports = { uploadPortfolioFile };
