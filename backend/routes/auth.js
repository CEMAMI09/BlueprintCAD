// Authentication routes
const express = require('express');
const router = express.Router();
const { getDb } = require('../../db/db');
const { hashPassword, verifyPassword, generateToken, getUserFromRequest } = require('../lib/auth');

// Register new user
router.post('/register', async (req, res) => {
  try {
    // 🔥 LOG WHAT THE BACKEND RECEIVED
    console.log("REGISTER BODY:", req.body);

    const { username, email, password } = req.body;

    // 🔥 LOG THE VALUES WE'RE ABOUT TO QUERY WITH
    console.log("Checking DB for:", { username, email });

    if (!username || !email || !password) {
      console.log("❌ Missing field(s)");
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await getDb();

    // Check if user exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    // 🔥 LOG WHAT THE DATABASE RETURNED
    console.log("DB returned:", existingUser);

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await db.run(
      'INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, datetime("now"))',
      [username, email, hashedPassword]
    );

    const token = generateToken(result.lastID, username);

    res.status(201).json({
      token,
      user: {
        id: result.lastID,
        username,
        email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const db = await getDb();
    const isEmail = identifier.includes('@');

    const user = await db.get(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [isEmail ? identifier : null, !isEmail ? identifier : null]
    );

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.username);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

module.exports = router;