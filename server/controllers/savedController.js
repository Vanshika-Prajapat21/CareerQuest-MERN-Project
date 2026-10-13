const SavedOpportunity = require("../models/SavedOpportunity");
const Opportunity = require("../models/Opportunity");
const asyncHandler = require("../utils/asyncHandler");
const { calculateMatch } = require("../utils/matching");

// POST /api/saved/:opportunityId
const saveOpportunity = asyncHandler(async (req, res) => {
  if (!(await Opportunity.exists({ _id: req.params.opportunityId }))) {
    res.status(404);
    throw new Error("Opportunity not found");
  }
  // upsert = create if missing, do nothing if it already exists
  await SavedOpportunity.updateOne(
    { userId: req.user._id, opportunityId: req.params.opportunityId },
    { $setOnInsert: { savedAt: new Date() } },
    { upsert: true }
  );
  res.status(201).json({ message: "Saved" });
});

// DELETE /api/saved/:opportunityId
const removeSaved = asyncHandler(async (req, res) => {
  await SavedOpportunity.deleteOne({ userId: req.user._id, opportunityId: req.params.opportunityId });
  res.json({ message: "Removed from saved" });
});

// GET /api/saved
const getSaved = asyncHandler(async (req, res) => {
  const saved = await SavedOpportunity.find({ userId: req.user._id }).sort({ savedAt: -1 }).populate("opportunityId").lean();
  const list = saved
    .filter((s) => s.opportunityId) // skip if the opportunity was deleted
    .map((s) => {
      const o = s.opportunityId;
      const m = calculateMatch(req.user, o);
      return { ...o, match: { score: m.score, label: m.label }, isSaved: true, savedAt: s.savedAt };
    });
  res.json(list);
});

module.exports = { saveOpportunity, removeSaved, getSaved };
