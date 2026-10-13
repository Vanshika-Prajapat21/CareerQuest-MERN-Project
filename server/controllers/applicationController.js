const Application = require("../models/Application");
const Opportunity = require("../models/Opportunity");
const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");
const { getSafeApplyUrl, withSafeLink } = require("../utils/url");
const { validateApplicationForm, validateResumeFile } = require("../utils/applicationValidation");
const { saveResume, deleteResumeFile, resumeFilePath } = require("../utils/files");

const STATUSES = ["Interested", "Applied", "Shortlisted", "Rejected", "Selected"];
const ADMIN_STATUSES = ["Applied", "Shortlisted", "Rejected", "Selected"]; // what an admin may set on internal applications

const fail = (res, code, message) => {
  res.status(code);
  throw new Error(message);
};

const plain = (d) => (d && typeof d.toObject === "function" ? d.toObject() : d);
const safeFileName = (name) => String(name || "resume.pdf").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 100) || "resume.pdf";

// What we send to the browser: never the server-side file name; applicant details only when asked
const publicApp = (doc, { withApplicant = false } = {}) => {
  const a = { ...plain(doc) };
  if (a.resume) {
    const { storedName, ...rest } = a.resume;
    a.resume = rest;
  }
  if (!withApplicant) delete a.applicant;
  if (a.opportunityId && typeof a.opportunityId === "object" && a.opportunityId.title) {
    a.opportunityId = withSafeLink(plain(a.opportunityId)); // old placeholder links can never reach the page
  }
  return a;
};

const sendResume = (res, app) => {
  const file = app && app.type === "Internal" && app.resume && resumeFilePath(app.resume.storedName);
  if (!file) fail(res, 404, "Resume not found");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeFileName(app.resume.originalName)}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.status(404).json({ message: "Resume file is missing" });
  });
};

/* ===================== STUDENT ===================== */

// POST /api/applications/:opportunityId   body: { status, keepExisting }
// Personal tracking of an application made OUTSIDE CareerQuest (never marks anything as submitted by itself)
const createApplication = asyncHandler(async (req, res) => {
  const opp = await Opportunity.findById(req.params.opportunityId);
  if (!opp) fail(res, 404, "Opportunity not found");

  const status = STATUSES.includes(req.body.status) ? req.body.status : "Interested";
  const existing = await Application.findOne({ userId: req.user._id, opportunityId: opp._id });

  if (existing) {
    if (existing.type === "Internal") fail(res, 409, "You already applied through CareerQuest. Its status is updated by the organization.");
    if (req.body.keepExisting) return res.json(publicApp(existing)); // e.g. opening the website again: never change the status
    existing.status = status;
    existing.statusUpdatedAt = new Date();
    await existing.save();
    return res.json(publicApp(existing));
  }

  const app = await Application.create({ userId: req.user._id, opportunityId: opp._id, type: "External", status, appliedAt: new Date() });
  res.status(201).json(publicApp(app));
});

// POST /api/applications/:opportunityId/internal   (multipart form: fields + "resume" PDF)
const submitInternalApplication = asyncHandler(async (req, res) => {
  const opp = await Opportunity.findById(req.params.opportunityId);
  if (!opp) fail(res, 404, "Opportunity not found");
  if (opp.status !== "active" || new Date(opp.deadline) < new Date()) fail(res, 400, "Applications for this opportunity are closed");
  if (getSafeApplyUrl(opp.applicationLink)) fail(res, 400, "This opportunity accepts applications on its official website");

  // 1) validate everything BEFORE touching the disk or the database
  const { errors, values } = validateApplicationForm(req.body);
  const resumeError = validateResumeFile(req.file);
  if (resumeError) errors.resume = resumeError;
  if (Object.keys(errors).length) {
    res.status(400);
    return res.json({ message: "Please fix the highlighted fields", errors });
  }

  // 2) duplicate check (userId comes from the login token, never from the request body)
  const existing = await Application.findOne({ userId: req.user._id, opportunityId: opp._id });
  if (existing && existing.type === "Internal") {
    res.status(409);
    return res.json({ message: "You have already applied to this opportunity", applicationId: existing._id });
  }

  // 3) save the file, then the record
  const storedName = await saveResume(req.file.buffer);
  const data = {
    type: "Internal",
    status: "Applied",
    appliedAt: new Date(),
    statusUpdatedAt: new Date(),
    applicant: values,
    resume: { originalName: safeFileName(req.file.originalname), storedName, mimeType: "application/pdf", size: req.file.buffer.length, uploadedAt: new Date() },
  };

  let app;
  try {
    if (existing) {
      Object.assign(existing, data); // the student was only tracking this one: upgrade that record, no duplicate
      app = await existing.save();
    } else {
      app = await Application.create({ userId: req.user._id, opportunityId: opp._id, ...data });
    }
  } catch (err) {
    await deleteResumeFile(storedName); // do not leave orphan files behind
    if (err.code === 11000) {
      res.status(409);
      return res.json({ message: "You have already applied to this opportunity" });
    }
    throw err;
  }

  await Notification.create({
    userId: req.user._id,
    title: "Application submitted",
    message: `Your application for ${opp.title} at ${opp.organization} was submitted.`,
    type: "application",
    opportunityId: opp._id,
  });

  // Success is reported only now, after MongoDB confirmed the save
  res.status(201).json({ message: "Application submitted successfully", application: publicApp(app) });
});

// GET /api/applications  (history, no applicant details in the list)
const getApplications = asyncHandler(async (req, res) => {
  const apps = await Application.find({ userId: req.user._id }).sort({ appliedAt: -1 }).populate("opportunityId");
  res.json(apps.filter((a) => a.opportunityId).map((a) => publicApp(a)));
});

// GET /api/applications/:id  (owner only)
const getApplicationById = asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.user._id }).populate("opportunityId");
  if (!app || !app.opportunityId) fail(res, 404, "Application not found");
  res.json(publicApp(app, { withApplicant: true }));
});

// GET /api/applications/:id/resume  (owner only)
const downloadMyResume = asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.user._id });
  if (!app) fail(res, 404, "Application not found");
  sendResume(res, app);
});

// PUT /api/applications/:id   body: { status }   (tracking of EXTERNAL applications only)
const updateApplication = asyncHandler(async (req, res) => {
  if (!STATUSES.includes(req.body.status)) fail(res, 400, "Invalid status");
  const app = await Application.findOne({ _id: req.params.id, userId: req.user._id }); // userId = ownership check
  if (!app) fail(res, 404, "Application not found");
  if (app.type === "Internal") fail(res, 403, "The status of applications submitted through CareerQuest is updated by the organization");
  app.status = req.body.status;
  app.statusUpdatedAt = new Date();
  await app.save();
  res.json(publicApp(app));
});

// DELETE /api/applications/:id   (external tracking records only)
const deleteApplication = asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.user._id });
  if (!app) fail(res, 404, "Application not found");
  if (app.type === "Internal") fail(res, 403, "Submitted applications cannot be removed");
  await Application.deleteOne({ _id: app._id, userId: req.user._id });
  res.json({ message: "Application removed" });
});

/* ===================== ADMIN ===================== */

// GET /api/admin/applications?status=&opportunityId=
const adminListApplications = asyncHandler(async (req, res) => {
  const filter = { type: "Internal" };
  if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.opportunityId) filter.opportunityId = req.query.opportunityId;
  const apps = await Application.find(filter).sort({ appliedAt: -1 }).populate("userId", "name email").populate("opportunityId", "title organization type");
  res.json(apps.filter((a) => a.opportunityId && a.userId).map((a) => publicApp(a, { withApplicant: true })));
});

// GET /api/admin/applications/:id
const adminGetApplication = asyncHandler(async (req, res) => {
  const app = await Application.findById(req.params.id).populate("userId", "name email").populate("opportunityId");
  if (!app || app.type !== "Internal" || !app.opportunityId) fail(res, 404, "Application not found");
  res.json(publicApp(app, { withApplicant: true }));
});

// PUT /api/admin/applications/:id/status   body: { status }
const adminUpdateApplicationStatus = asyncHandler(async (req, res) => {
  if (!ADMIN_STATUSES.includes(req.body.status)) fail(res, 400, "Status must be Applied, Shortlisted, Rejected or Selected");
  const app = await Application.findById(req.params.id);
  if (!app || app.type !== "Internal") fail(res, 404, "Internal application not found");

  app.status = req.body.status;
  app.statusUpdatedAt = new Date();
  await app.save();

  if (app.status !== "Applied") {
    const opp = await Opportunity.findById(app.opportunityId);
    await Notification.create({
      userId: app.userId,
      title: "Application update",
      message: `Your application for ${opp ? opp.title : "an opportunity"} is now "${app.status}".`,
      type: "application",
      opportunityId: app.opportunityId,
    });
  }
  res.json(publicApp(app, { withApplicant: true }));
});

// GET /api/admin/applications/:id/resume
const adminDownloadResume = asyncHandler(async (req, res) => {
  const app = await Application.findById(req.params.id);
  if (!app) fail(res, 404, "Application not found");
  sendResume(res, app);
});

module.exports = {
  createApplication, submitInternalApplication, getApplications, getApplicationById, downloadMyResume,
  updateApplication, deleteApplication,
  adminListApplications, adminGetApplication, adminUpdateApplicationStatus, adminDownloadResume,
};
