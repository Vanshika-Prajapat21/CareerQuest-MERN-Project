const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");
const { toArray, sanitizeUser } = require("../utils/helpers");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, education, college, skills, interests, location } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    res.status(400);
    throw new Error("Email already registered");
  }

  // SECURITY: role is NOT taken from req.body, so nobody can register as admin
  const user = await User.create({
    name, email, password, education, college, location,
    skills: toArray(skills),
    interests: toArray(interests),
  });

  res.status(201).json({ token: generateToken(user._id), user: sanitizeUser(user) });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
const { email, password, role } = req.body;

if (!email || !password) {
res.status(400);
throw new Error("Email and password are required");
}

if (!["student", "admin"].includes(role)) {
res.status(400);
throw new Error("Please select Student or Admin login");
}

const user = await User.findOne({
email: email.trim().toLowerCase(),
}).select("+password");

if (!user || !(await user.matchPassword(password))) {
res.status(401);
throw new Error("Invalid email or password");
}

// The selected role must match the role stored in MongoDB.
if (user.role !== role) {
res.status(403);
throw new Error(
role === "admin"
? "This account is not registered as an admin"
: "This account is not registered as a student"
);
}

res.json({
token: generateToken(user._id),
user: sanitizeUser(user),
});
});
// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => res.json(req.user));

// POST /api/auth/logout  (JWT is stateless, so the browser simply deletes its token)
const logout = (req, res) => res.json({ message: "Logged out" });

module.exports = { register, login, getMe, logout };
