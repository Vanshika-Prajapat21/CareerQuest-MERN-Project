const router = require("express").Router();
const { saveOpportunity, removeSaved, getSaved } = require("../controllers/savedController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/", getSaved);
router.post("/:opportunityId", saveOpportunity);
router.delete("/:opportunityId", removeSaved);

module.exports = router;
