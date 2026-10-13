const multer = require("multer");
const { maxResumeBytes } = require("../utils/applicationValidation");

// The file is kept in memory first, checked, and only then written to disk by the controller
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxResumeBytes(), files: 1, fields: 20 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf" || !/\.pdf$/i.test(file.originalname)) {
      const err = new Error("Resume must be a PDF file");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

module.exports = { uploadResume: upload.single("resume") };
