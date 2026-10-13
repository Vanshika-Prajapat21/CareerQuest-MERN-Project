const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Reads "Authorization: Bearer <token>" and returns the matching user (or null)
const getUserFromRequest = async (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET); // throws if fake/expired
  return User.findById(decoded.id);
};

// protect = "you must be logged in"
const protect = async (req, res, next) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401);
      throw new Error("Not authorized, please log in");
    }
    req.user = user; // later code can read req.user
    next();
  } catch (err) {
    res.status(401);
    next(new Error(err.message.includes("jwt") ? "Session expired, please log in again" : err.message));
  }
};

// optionalAuth = "log in if a token exists, but don't block visitors"
const optionalAuth = async (req, res, next) => {
  try {
    req.user = await getUserFromRequest(req);
  } catch (err) {
    req.user = null;
  }
  next();
};

// adminOnly = "role must be admin" (always used AFTER protect)
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  res.status(403);
  next(new Error("Admin access only"));
};

// studentOnly = "role must be student" (always used AFTER protect)
const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === "student") return next();
  res.status(403);
  next(new Error("Student access only"));
};

module.exports = { protect, optionalAuth, adminOnly, studentOnly };
