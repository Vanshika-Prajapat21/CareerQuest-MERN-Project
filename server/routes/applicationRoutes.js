const router = require("express").Router();
const c = require("../controllers/applicationController");
const { protect, studentOnly } = require("../middleware/auth");
const { uploadResume } = require("../middleware/upload");

router.use(protect, studentOnly); // logged in AND role "student" for every route below

router.get("/", c.getApplications);
router.get("/:id/resume", c.downloadMyResume);
router.get("/:id", c.getApplicationById);
router.post("/:opportunityId/internal", uploadResume, c.submitInternalApplication);
router.post("/:opportunityId", c.createApplication);
router.put("/:id", c.updateApplication);
router.delete("/:id", c.deleteApplication);

module.exports = router;
