const User = require("../models/User");
const Opportunity = require("../models/Opportunity");
const Application = require("../models/Application");
const SavedOpportunity = require("../models/SavedOpportunity");
const Notification = require("../models/Notification");
const Report = require("../models/Report");
const asyncHandler = require("../utils/asyncHandler");
const { expireOldOpportunities } = require("../utils/helpers");
const { removeApplications } = require("../utils/files");

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  await expireOldOpportunities();
  const [
    totalUsers,
    totalOpportunities,
    activeOpportunities,
    expiredOpportunities,
    totalApplications,
    openReports,
    popularCategories,
    byType,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    Opportunity.countDocuments(),
    Opportunity.countDocuments({ status: "active" }),
    Opportunity.countDocuments({ status: "expired" }),
    Application.countDocuments(),
    Report.countDocuments({ status: "open" }),
    Opportunity.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Opportunity.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  res.json({
    totalUsers,
    totalOpportunities,
    activeOpportunities,
    expiredOpportunities,
    totalApplications,
    openReports,
    popularCategories,
    byType,
  });
});

// GET /api/admin/users
const getUsers = asyncHandler(async (req, res) =>
  res.json(await User.find().sort({ createdAt: -1 })),
);

// PUT /api/admin/users/:id/role
const updateUserRole = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    res.status(400);
    throw new Error("You cannot change your own role");
  }
  if (!["student", "admin"].includes(req.body.role)) {
    res.status(400);
    throw new Error("Invalid role");
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { new: true },
  );
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json(user);
});

// DELETE /api/admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    res.status(400);
    throw new Error("You cannot delete your own account");
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  await Promise.all([
    SavedOpportunity.deleteMany({ userId: user._id }),
    removeApplications(Application, { userId: user._id }),
    Notification.deleteMany({ userId: user._id }),
    Report.deleteMany({ userId: user._id }),
  ]);
  res.json({ message: "User deleted" });
});

// GET /api/admin/reports
const getReports = asyncHandler(async (req, res) => {
  const reports = await Report.find()
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .populate("opportunityId", "title organization status");
  res.json(reports.filter((r) => r.opportunityId));
});

// PUT /api/admin/reports/:id  -> mark resolved
const resolveReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status: "resolved" },
    { new: true },
  );
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  res.json(report);
});

// DELETE /api/admin/reports/:id
const deleteReport = asyncHandler(async (req, res) => {
  await Report.findByIdAndDelete(req.params.id);
  res.json({ message: "Report deleted" });
});

module.exports = {
  getStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getReports,
  resolveReport,
  deleteReport,
};
