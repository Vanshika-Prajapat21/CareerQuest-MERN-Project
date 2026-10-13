const router = require("express").Router();
const c = require("../controllers/opportunityController");
const { protect, optionalAuth, adminOnly } = require("../middleware/auth");

// Public (optionalAuth adds match scores when a student is logged in)
router.get("/", optionalAuth, c.getOpportunities);
router.get("/meta/filters", c.getFilterOptions); // must stay ABOVE "/:id"
router.get("/:id", optionalAuth, c.getOpportunityById);

// Student
router.post("/:id/report", protect, c.reportOpportunity);

// Admin only
router.post("/", protect, adminOnly, c.createOpportunity);
router.put("/:id/expire", protect, adminOnly, c.expireOpportunity);
router.put("/:id", protect, adminOnly, c.updateOpportunity);
router.delete("/:id", protect, adminOnly, c.deleteOpportunity);

module.exports = router;
