const jwt = require("jsonwebtoken");

// The token stores only the user id, signed with our secret
module.exports = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
