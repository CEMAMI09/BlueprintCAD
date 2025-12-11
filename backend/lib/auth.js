// Authentication utilities
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function getUserFromRequest(req) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  return verifyToken(token);
}

async function verifyAuth(req) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  return verifyToken(token);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getUserFromRequest,
  verifyAuth
};