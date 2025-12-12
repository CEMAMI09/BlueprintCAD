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

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await getDb();

    const existingUser = await db.get(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const result = await db.run(
      `INSERT INTO users (username, email, password, tier, created_at)
       VALUES (?, ?, ?, 'free', datetime('now'))`,
      [username, email, hashedPassword]
    );

    const userId = result.lastID;

    const user = {
      id: userId,
      username,
      email,
      tier: "free",
    };

    const token = generateToken(user);

    // Set HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({ token, user });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Failed to register user" });
  }
});

// POST /api/auth/login
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

    const userObj = {
      id: user.id,
      username: user.username,
      email: user.email,
      tier: user.tier || "free",
    };

    const token = generateToken(userObj);

    // Set HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ token, user: userObj });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Failed to login" });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = await getDb();
    const dbUser = await db.get(
      "SELECT id, username, email, tier, profile_picture, created_at FROM users WHERE id = ?",
      [decoded.userId]
    );

    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        tier: dbUser.tier || "free",
        profile_picture: dbUser.profile_picture || null,
        created_at: dbUser.created_at,
      },
    });
  } catch (error) {
    console.error("ME endpoint error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ success: true });
});

module.exports = router;