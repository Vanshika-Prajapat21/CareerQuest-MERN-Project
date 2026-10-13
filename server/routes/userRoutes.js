const router = require("express").Router();
const { getProfile, updateProfile, changePassword, getDashboard } = require("../controllers/userController");
const { protect } = require("../middleware/auth");

router.use(protect); // every route below needs login
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/password", changePassword);
router.get("/dashboard", getDashboard);

module.exports = router;
