const Notification = require("../models/Notification");
const SavedOpportunity = require("../models/SavedOpportunity");
const Opportunity = require("../models/Opportunity");
const asyncHandler = require("../utils/asyncHandler");

// Create a "deadline soon" notification (once) for saved items closing within 3 days
const createDeadlineNotifications = async (userId) => {
  const saved = await SavedOpportunity.find({ userId }).select("opportunityId");
  const now = new Date();
  const soon = await Opportunity.find({
    _id: { $in: saved.map((s) => s.opportunityId) },
    status: "active",
    deadline: { $gte: now, $lte: new Date(now.getTime() + 3 * 86400000) },
  });

  for (const opp of soon) {
    const exists = await Notification.exists({ userId, opportunityId: opp._id, type: "deadline" });
    if (!exists) {
      await Notification.create({
        userId,
        title: "Deadline approaching",
        message: `${opp.title} closes on ${opp.deadline.toDateString()}. Don't miss it!`,
        type: "deadline",
        opportunityId: opp._id,
      });
    }
  }
};

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  await createDeadlineNotifications(req.user._id);
  const list = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json(list);
});

// PUT /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const note = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!note) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json(note);
});

// PUT /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: "All notifications marked as read" });
});

module.exports = { getNotifications, markRead, markAllRead };
