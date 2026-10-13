const router = require("express").Router();
const c = require("../controllers/adminController");
const apps = require("../controllers/applicationController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly); // every admin route needs login AND admin role
router.get("/stats", c.getStats);
router.get("/users", c.getUsers);
router.put("/users/:id/role", c.updateUserRole);
router.delete("/users/:id", c.deleteUser);
router.get("/applications", apps.adminListApplications);
router.get("/applications/:id/resume", apps.adminDownloadResume);
router.get("/applications/:id", apps.adminGetApplication);
router.put("/applications/:id/status", apps.adminUpdateApplicationStatus);
router.get("/reports", c.getReports);
router.put("/reports/:id", c.resolveReport);
router.delete("/reports/:id", c.deleteReport);

module.exports = router;
