const Opportunity = require("../models/Opportunity");
const asyncHandler = require("../utils/asyncHandler");
const { calculateMatch } = require("../utils/matching");
const { getSavedIdSet, expireOldOpportunities } = require("../utils/helpers");

// GET /api/recommendations?min=60&limit=20
const getRecommendations = asyncHandler(async (req, res) => {
  await expireOldOpportunities();
  const min = Number(req.query.min) || 0;
  const limit = Number(req.query.limit) || 50;

  const [opps, savedIds] = await Promise.all([
    Opportunity.find({ status: "active" }).lean(),
    getSavedIdSet(req.user._id),
  ]);

  const list = opps
    .map((o) => {
      const m = calculateMatch(req.user, o);
      return { ...o, match: { score: m.score, label: m.label }, isSaved: savedIds.has(String(o._id)) };
    })
    .filter((o) => o.match.score >= min)
    .sort((a, b) => b.match.score - a.match.score) // highest match first
    .slice(0, limit);

  res.json(list);
});

module.exports = { getRecommendations };
