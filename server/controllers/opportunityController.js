const Opportunity = require("../models/Opportunity");
const Application = require("../models/Application");
const SavedOpportunity = require("../models/SavedOpportunity");
const Notification = require("../models/Notification");
const Report = require("../models/Report");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { calculateMatch } = require("../utils/matching");
const { withSafeLink } = require("../utils/url");
const { removeApplications } = require("../utils/files");
const { toArray, escapeRegex, getSavedIdSet, expireOldOpportunities } = require("../utils/helpers");

// Copy only allowed fields from the request body
const pickFields = (body) => {
  const fields = ["title", "description", "type", "organization", "eligibility", "location", "mode",
    "stipend", "salary", "deadline", "applicationLink", "logo", "category", "status", "featured"];
  const data = {};
  fields.forEach((f) => { if (body[f] !== undefined) data[f] = body[f]; });
  if (body.skills !== undefined) data.skills = toArray(body.skills);
  if (body.education !== undefined) data.education = toArray(body.education);
  return data;
};

// GET /api/opportunities?q=&type=&skills=&location=&mode=&organization=&deadline=&sort=&page=&limit=
const getOpportunities = asyncHandler(async (req, res) => {
  await expireOldOpportunities();
  const { q, type, skills, location, mode, organization, deadline, category, status, featured, sort } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 12, 50);

  const filter = {};
  if (status !== "all") filter.status = status || "active";
  if (type) filter.type = type;
  if (mode) filter.mode = mode;
  if (category) filter.category = category;
  if (featured === "true") filter.featured = true;
  if (location) filter.location = new RegExp(escapeRegex(location), "i");
  if (organization) filter.organization = new RegExp(escapeRegex(organization), "i");
  if (deadline) filter.deadline = { $lte: new Date(deadline) };
  if (skills) filter.skills = { $in: toArray(skills).map((s) => new RegExp(`^${escapeRegex(s)}$`, "i")) };
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: rx }, { organization: rx }, { description: rx }, { skills: rx }];
  }

  let list = (await Opportunity.find(filter).lean()).map(withSafeLink);

  // Logged-in students get a match score + saved flag on every card
  const isStudent = req.user && req.user.role === "student";
  if (isStudent) {
    const savedIds = await getSavedIdSet(req.user._id);
    list = list.map((o) => {
      const m = calculateMatch(req.user, o);
      return { ...o, match: { score: m.score, label: m.label }, isSaved: savedIds.has(String(o._id)) };
    });
  }

  // Sorting: students default to best match, everyone else to newest
  const sortBy = sort || (isStudent ? "match" : "newest");
  if (sortBy === "match" && isStudent) list.sort((a, b) => b.match.score - a.match.score);
  else if (sortBy === "deadline") list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Simple pagination done in memory (fine for an MVP-sized dataset)
  const total = list.length;
  const opportunities = list.slice((page - 1) * limit, page * limit);
  res.json({ opportunities, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

// GET /api/opportunities/meta/filters  -> values used to fill the filter dropdowns
const getFilterOptions = asyncHandler(async (req, res) => {
  const active = { status: "active" };
  const [types, organizations, locations, skills] = await Promise.all([
    Opportunity.distinct("type", active),
    Opportunity.distinct("organization", active),
    Opportunity.distinct("location", active),
    Opportunity.distinct("skills", active),
  ]);
  res.json({ types, organizations: organizations.sort(), locations: locations.sort(), skills: skills.sort() });
});

// GET /api/opportunities/:id
const getOpportunityById = asyncHandler(async (req, res) => {
  const found = await Opportunity.findById(req.params.id).lean();
  if (!found) {
    res.status(404);
    throw new Error("Opportunity not found");
  }
  const opp = withSafeLink(found); // adds hasApplyLink, blanks unsafe links

  if (req.user && req.user.role === "student") {
    opp.match = calculateMatch(req.user, opp); // includes full breakdown
    opp.isSaved = Boolean(await SavedOpportunity.findOne({ userId: req.user._id, opportunityId: opp._id }));
    const app = await Application.findOne({ userId: req.user._id, opportunityId: opp._id });
    opp.application = app ? { _id: app._id, status: app.status, type: app.type } : null;
  }
  res.json(opp);
});

// POST /api/opportunities  (admin)
const createOpportunity = asyncHandler(async (req, res) => {
  const opp = await Opportunity.create(pickFields(req.body));

  // Tell students who match well (score >= 70) about the new opportunity
  const students = await User.find({ role: "student" });
  const notes = students
    .filter((s) => calculateMatch(s, opp).score >= 70)
    .map((s) => ({
      userId: s._id,
      title: "New opportunity for you",
      message: `${opp.title} at ${opp.organization} matches your profile.`,
      type: "new_opportunity",
      opportunityId: opp._id,
    }));
  if (notes.length) await Notification.insertMany(notes);

  res.status(201).json(opp);
});

// PUT /api/opportunities/:id  (admin)
const updateOpportunity = asyncHandler(async (req, res) => {
  const opp = await Opportunity.findById(req.params.id);
  if (!opp) {
    res.status(404);
    throw new Error("Opportunity not found");
  }
  opp.set(pickFields(req.body));
  await opp.save(); // save() runs the schema validation
  res.json(opp);
});

// PUT /api/opportunities/:id/expire  (admin)
const expireOpportunity = asyncHandler(async (req, res) => {
  const opp = await Opportunity.findByIdAndUpdate(req.params.id, { status: "expired" }, { new: true });
  if (!opp) {
    res.status(404);
    throw new Error("Opportunity not found");
  }
  res.json(opp);
});

// DELETE /api/opportunities/:id  (admin) - also clean up related data
const deleteOpportunity = asyncHandler(async (req, res) => {
  const opp = await Opportunity.findByIdAndDelete(req.params.id);
  if (!opp) {
    res.status(404);
    throw new Error("Opportunity not found");
  }
  const id = opp._id;
  await Promise.all([
    SavedOpportunity.deleteMany({ opportunityId: id }),
    removeApplications(Application, { opportunityId: id }), // also deletes uploaded resumes
    Report.deleteMany({ opportunityId: id }),
    Notification.deleteMany({ opportunityId: id }),
  ]);
  res.json({ message: "Opportunity deleted" });
});

// POST /api/opportunities/:id/report  (student)
const reportOpportunity = asyncHandler(async (req, res) => {
  if (!(await Opportunity.exists({ _id: req.params.id }))) {
    res.status(404);
    throw new Error("Opportunity not found");
  }
  await Report.create({ userId: req.user._id, opportunityId: req.params.id, reason: req.body.reason });
  res.status(201).json({ message: "Thanks, our team will review this opportunity" });
});

module.exports = {
  getOpportunities, getFilterOptions, getOpportunityById, createOpportunity,
  updateOpportunity, expireOpportunity, deleteOpportunity, reportOpportunity,
};
