const User = require("../models/User");
const Application = require("../models/Application");
const SavedOpportunity = require("../models/SavedOpportunity");
const Notification = require("../models/Notification");
const Opportunity = require("../models/Opportunity");
const asyncHandler = require("../utils/asyncHandler");
const { calculateMatch } = require("../utils/matching");
const { toArray, getSavedIdSet, expireOldOpportunities } = require("../utils/helpers");

// GET /api/users/profile
const getProfile = asyncHandler(async (req, res) => res.json(req.user));

// PUT /api/users/profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { name, email, education, college, location, profileImage } = req.body;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (education !== undefined) user.education = education;
  if (college !== undefined) user.college = college;
  if (location !== undefined) user.location = location;
  if (profileImage !== undefined) user.profileImage = profileImage;
  if (req.body.skills !== undefined) user.skills = toArray(req.body.skills);
  if (req.body.interests !== undefined) user.interests = toArray(req.body.interests);
  if (req.body.preferredTypes !== undefined) user.preferredTypes = toArray(req.body.preferredTypes);

  await user.save();
  res.json(user);
});

// PUT /api/users/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error("Enter your current password and a new one (min 6 characters)");
  }
  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }
  user.password = newPassword; // the pre-save hook hashes it
  await user.save();
  res.json({ message: "Password updated" });
});

// GET /api/users/dashboard  -> numbers + top picks + upcoming deadlines for the student home
const getDashboard = asyncHandler(async (req, res) => {
  await expireOldOpportunities();
  const userId = req.user._id;

  const [saved, applications, unread, active] = await Promise.all([
    SavedOpportunity.find({ userId }),
    Application.find({ userId }),
    Notification.countDocuments({ userId, isRead: false }),
    Opportunity.find({ status: "active" }).lean(),
  ]);

  const savedIds = await getSavedIdSet(userId);
  const topPicks = active
    .map((o) => ({ ...o, match: calculateMatch(req.user, o), isSaved: savedIds.has(String(o._id)) }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 3)
    .map((o) => ({ ...o, match: { score: o.match.score, label: o.match.label } }));

  // Deadlines in the next 14 days for saved items and "Interested" applications
  const watchIds = [
    ...saved.map((s) => s.opportunityId),
    ...applications.filter((a) => a.status === "Interested").map((a) => a.opportunityId),
  ];
  const now = new Date();
  const upcomingDeadlines = await Opportunity.find({
    _id: { $in: watchIds },
    status: "active",
    deadline: { $gte: now, $lte: new Date(now.getTime() + 14 * 86400000) },
  }).sort({ deadline: 1 }).select("title organization deadline type");

  const byStatus = {};
  applications.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

  res.json({
    stats: { saved: saved.length, applications: applications.length, unread, byStatus },
    topPicks,
    upcomingDeadlines,
  });
});

module.exports = { getProfile, updateProfile, changePassword, getDashboard };
