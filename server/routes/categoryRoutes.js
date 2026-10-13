const router = require("express").Router();
const { getCategories, createCategory, deleteCategory } = require("../controllers/categoryController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", getCategories);
router.post("/", protect, adminOnly, createCategory);
router.delete("/:id", protect, adminOnly, deleteCategory);

module.exports = router;
