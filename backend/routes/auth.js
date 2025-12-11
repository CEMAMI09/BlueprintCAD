// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../../db/db");
const {
  hashPassword,
  verifyPassword,
  generateToken,
  getUserFromRequest,
} = require("../lib/auth");

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    console.log("REGISTER BODY:", req.body);

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await getDb();

    console.log("Checking DB for:", { username, email });
    const existingUser = await db.get(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    console.log("DB returned:", existingUser);

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const result = await db.run(
      `INSERT INTO users (username, email, password, tier, created_at)
       VALUES (?, ?, ?, 'free', datetime('now'))`,
      [username, email, hashedPassword]
    );

    const userId = result.lastID;

    const token = generateToken(userId, username, { tier: "free" });

    const user = await db.get(
      `SELECT id, username, email, tier, profile_picture, bio, location, website, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    return res.status(201).json({
      token,
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Failed to register user" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const db = await getDb();
    const isEmail = identifier.includes("@");

    const user = await db.get(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [isEmail ? identifier : null, !isEmail ? identifier : null]
    );

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id, user.username, {
      tier: user.tier || "free",
    });

    // Strip password before sending
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      tier: user.tier || "free",
      profile_picture: user.profile_picture,
      bio: user.bio,
      location: user.location,
      website: user.website,
      created_at: user.created_at,
    };

    return res.json({
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Failed to login" });
  }
});

// GET /auth/me  → current user
router.get("/me", async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    if (!user || !user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = await getDb();
    const dbUser = await db.get(
      "SELECT id, username, email, tier, profile_picture, bio, location, website, created_at FROM users WHERE id = ?",
      [user.userId]
    );

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      tier: dbUser.tier || "free",
      profile_picture: dbUser.profile_picture,
      bio: dbUser.bio,
      location: dbUser.location,
      website: dbUser.website,
      created_at: dbUser.created_at,
    });
  } catch (error) {
    console.error("ME endpoint error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

module.exports = router;