// Authentication utilities
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    process.env.NEXTAUTH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET);
  } catch (error) {
    return null;
  }
}

export function getUserFromRequest(req) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  return verifyToken(token);
}

export async function verifyAuth(req) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  return verifyToken(token);
}