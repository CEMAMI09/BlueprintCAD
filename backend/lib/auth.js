// backend/lib/auth.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Hash password
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Verify password
async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT with canonical payload format
function generateToken(user) {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email,
      tier: user.tier || "free",
    },
    secret,
    { expiresIn: "7d" }
  );
}

// Decode JWT safely
function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return null;
    }
    return jwt.verify(token, secret);
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

    return verifyToken(token); // { userId, username, email, tier }
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