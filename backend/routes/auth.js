// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const { getOne, execute } = require("../lib/db");
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

    // Password is required for email/password registration
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Check for existing user
    const existingUser = await getOne(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const hashedPassword = await hashPassword(password);

    // Insert user and return the new user ID
    const result = await execute(
      `INSERT INTO users (username, email, password, tier, created_at)
       VALUES ($1, $2, $3, 'free', NOW())
       RETURNING id`,
      [username, email, hashedPassword]
    );

    // PostgreSQL returns rows in result.rows
    const userId = result.rows?.[0]?.id;

    const user = {
      id: userId,
      username,
      email,
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

    const isEmail = identifier.includes("@");

    // Query PostgreSQL - handle both email and username
    let user;
    if (isEmail) {
      user = await getOne(
        "SELECT * FROM users WHERE email = $1",
        [identifier]
      );
    } else {
      user = await getOne(
        "SELECT * FROM users WHERE username = $1",
        [identifier]
      );
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user is OAuth-only (no password)
    if (!user.password) {
      return res.status(401).json({ 
        error: "This account was created with OAuth. Please sign in with your OAuth provider." 
      });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userObj = {
      id: user.id,
      username: user.username,
      email: user.email,
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

    const dbUser = await getOne(
      "SELECT id, username, email, tier, profile_picture, created_at FROM users WHERE id = $1",
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

// POST /api/auth/setup-password - Set password for OAuth users
router.post("/setup-password", async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { password } = req.body || {};

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    // Check if user already has a password
    const existingUser = await getOne("SELECT password FROM users WHERE id = $1", [user.userId]);
    if (existingUser && existingUser.password) {
      return res.status(400).json({ error: "Password already set. Use change password instead." });
    }

    // Hash and set password
    const hashedPassword = await hashPassword(password);
    await execute("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, user.userId]);

    return res.json({ message: "Password set successfully" });
  } catch (error) {
    console.error("Setup password error:", error);
    return res.status(500).json({ error: "Failed to set password" });
  }
});

module.exports = router;
