const Category = require("../models/Category");
const asyncHandler = require("../utils/asyncHandler");

const getCategories = asyncHandler(async (req, res) => res.json(await Category.find().sort({ name: 1 })));

const createCategory = asyncHandler(async (req, res) => {
  const cat = await Category.create({ name: req.body.name, description: req.body.description });
  res.status(201).json(cat);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ message: "Category deleted" });
});

module.exports = { getCategories, createCategory, deleteCategory };
