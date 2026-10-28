const express = require("express");
const { protect, studentOnly } = require("../middleware/auth");
const { uploadPortfolioFile } = require("../middleware/portfolioUpload");
const {
  listItems,
  createItem,
  updateItem,
  deleteItem,
} = require("../controllers/portfolioController");
const router = express.Router();
router.use(protect, studentOnly);
router.get("/", listItems);
router.post("/", uploadPortfolioFile, createItem);
router.put("/:id", uploadPortfolioFile, updateItem);
router.delete("/:id", deleteItem);
module.exports = router;
