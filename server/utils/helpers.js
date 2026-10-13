const SavedOpportunity = require("../models/SavedOpportunity");
const Opportunity = require("../models/Opportunity");

// Accepts ["a","b"] or "a, b" and always returns a clean array
const toArray = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
};

// Escape special characters so user text is safe inside a RegExp
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Set of opportunity ids this user saved (used to show filled bookmark icons)
const getSavedIdSet = async (userId) => {
  const saved = await SavedOpportunity.find({ userId }).select("opportunityId");
  return new Set(saved.map((s) => String(s.opportunityId)));
};

// Opportunities whose deadline passed become "expired" automatically
const expireOldOpportunities = () =>
  Opportunity.updateMany({ status: "active", deadline: { $lt: new Date() } }, { status: "expired" });

const sanitizeUser = (user) => {
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

module.exports = { toArray, escapeRegex, getSavedIdSet, expireOldOpportunities, sanitizeUser };
