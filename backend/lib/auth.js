// backend/lib/auth.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  console.warn("⚠️ WARNING: JWT_SECRET or NEXTAUTH_SECRET is not defined in environment!");
}

// Hash password
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Verify password
async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT
function generateToken(userId, username, extra = {}) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }

  return jwt.sign(
    {
      userId,
      username,
      ...extra, // tier, profile info, etc.
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Decode JWT safely
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Extract user from Authorization header OR cookie
function getUserFromRequest(req) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) return null;

    return verifyToken(token); // { userId, username, tier }
  } catch (err) {
    return null;
  }
}

// Explicit wrapper
async function verifyAuth(req) {
  return getUserFromRequest(req);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getUserFromRequest,
  verifyAuth,
};