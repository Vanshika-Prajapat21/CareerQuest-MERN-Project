const mongoose = require("mongoose");

const savedSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: "Opportunity", required: true },
  savedAt: { type: Date, default: Date.now },
});

savedSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
module.exports = mongoose.model("SavedOpportunity", savedSchema);
