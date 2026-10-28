const PortfolioItem = require("../models/PortfolioItem");
const asyncHandler = require("../utils/asyncHandler");

const allowedTypes = ["certificate", "achievement", "project"];
const cleanList = (value) => Array.isArray(value) ? value.map(String).map(s => s.trim()).filter(Boolean).slice(0, 30) : String(value || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 30);
const safeUrl = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  try { const u = new URL(v); return ["http:", "https:"].includes(u.protocol) ? v : ""; } catch { return ""; }
};

exports.listItems = asyncHandler(async (req, res) => {
  const filter = { owner: req.user._id };
  if (req.query.type && allowedTypes.includes(req.query.type)) filter.type = req.query.type;
  const items = await PortfolioItem.find(filter).sort({ date: -1, createdAt: -1 });
  res.json({ items });
});

exports.createItem = asyncHandler(async (req, res) => {
  const { type, title, organization, date, description, skills, credentialUrl, githubUrl, demoUrl } = req.body;
  if (!allowedTypes.includes(type)) { res.status(400); throw new Error("Choose a valid portfolio item type"); }
  if (!String(title || "").trim()) { res.status(400); throw new Error("Title is required"); }
  const item = await PortfolioItem.create({
    owner: req.user._id, type, title: String(title).trim(), organization: String(organization || "").trim(),
    date: date ? new Date(date) : null, description: String(description || "").trim(), skills: cleanList(skills),
    credentialUrl: safeUrl(credentialUrl), githubUrl: safeUrl(githubUrl), demoUrl: safeUrl(demoUrl),
    fileUrl: req.file ? `/uploads/portfolio/${req.file.filename}` : "",
  });
  res.status(201).json({ item });
});

exports.updateItem = asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOne({ _id: req.params.id, owner: req.user._id });
  if (!item) { res.status(404); throw new Error("Portfolio item not found"); }
  const { type, title, organization, date, description, skills, credentialUrl, githubUrl, demoUrl } = req.body;
  if (type && allowedTypes.includes(type)) item.type = type;
  if (title !== undefined) { if (!String(title).trim()) { res.status(400); throw new Error("Title is required"); } item.title = String(title).trim(); }
  if (organization !== undefined) item.organization = String(organization).trim();
  if (date !== undefined) item.date = date ? new Date(date) : null;
  if (description !== undefined) item.description = String(description).trim();
  if (skills !== undefined) item.skills = cleanList(skills);
  if (credentialUrl !== undefined) item.credentialUrl = safeUrl(credentialUrl);
  if (githubUrl !== undefined) item.githubUrl = safeUrl(githubUrl);
  if (demoUrl !== undefined) item.demoUrl = safeUrl(demoUrl);
  if (req.file) item.fileUrl = `/uploads/portfolio/${req.file.filename}`;
  await item.save();
  res.json({ item });
});

exports.deleteItem = asyncHandler(async (req, res) => {
  const item = await PortfolioItem.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!item) { res.status(404); throw new Error("Portfolio item not found"); }
  res.json({ message: "Portfolio item deleted" });
});
