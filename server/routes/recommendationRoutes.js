const router = require("express").Router();
const { getRecommendations } = require("../controllers/recommendationController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getRecommendations);

module.exports = router;
