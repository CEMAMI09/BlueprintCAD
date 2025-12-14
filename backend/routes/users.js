// backend/routes/users.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../../db/db");
const { getUserFromRequest } = require("../lib/auth");
const formidable = require("formidable");

// GET /api/users/me - Get current user
router.get("/me", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = await getDb();
    const user = await db.get(
      `SELECT 
        id, 
        username, 
        email, 
        tier, 
        profile_picture, 
        bio,
        location,
        website,
        banner,
        social_links,
        visibility_options,
        profile_private,
        created_at 
      FROM users 
      WHERE id = ?`,
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Parse JSON fields
    let socialLinks = {};
    let visibilityOptions = {};
    try {
      socialLinks = user.social_links ? JSON.parse(user.social_links) : {};
    } catch (e) {
      // Ignore parse errors
    }
    try {
      visibilityOptions = user.visibility_options ? JSON.parse(user.visibility_options) : {};
    } catch (e) {
      // Ignore parse errors
    }

    // Get user stats
    const stats = await db.get(
      `SELECT 
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT f.id) as total_files
      FROM users u
      LEFT JOIN projects p ON p.user_id = u.id
      LEFT JOIN cad_files cf ON cf.user_id = u.id
      LEFT JOIN folders f ON f.owner_id = u.id
      WHERE u.id = ?`,
      [decoded.userId]
    );

    // Calculate storage used (sum of project file sizes)
    const storageResult = await db.get(
      `SELECT COALESCE(SUM(file_size), 0) as storage_used
       FROM cad_files
       WHERE user_id = ?`,
      [decoded.userId]
    );

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      tier: user.tier || "free",
      profile_picture: user.profile_picture || null,
      bio: user.bio || null,
      location: user.location || null,
      website: user.website || null,
      banner: user.banner || null,
      social_links: socialLinks,
      visibility_options: visibilityOptions,
      profile_private: user.profile_private || false,
      created_at: user.created_at,
      stats: {
        total_projects: stats?.total_projects || 0,
        total_files: stats?.total_files || 0,
        storage_used: storageResult?.storage_used || 0,
      },
    });
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /api/users/me - Update current user
router.put("/me", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = await getDb();
    
    // Handle both JSON and FormData
    let username, email, bio, location, website, profile_private, social_links, visibility_options;
    
    // Check if content-type is multipart/form-data
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      // Parse FormData using formidable
      const form = formidable({ multiples: true });
      const [fields, files] = await form.parse(req);
      
      username = fields.username?.[0];
      email = fields.email?.[0];
      bio = fields.bio?.[0];
      location = fields.location?.[0];
      website = fields.website?.[0];
      profile_private = fields.profile_private?.[0] === "true";
      
      // Parse JSON fields
      if (fields.social_links?.[0]) {
        try {
          social_links = JSON.parse(fields.social_links[0]);
        } catch (e) {
          social_links = {};
        }
      }
      if (fields.visibility_options?.[0]) {
        try {
          visibility_options = JSON.parse(fields.visibility_options[0]);
        } catch (e) {
          visibility_options = {};
        }
      }
      
      // File handling is stubbed - files are in the files object but not processed
      // In a full implementation, you would save profile_picture and banner files here
    } else {
      // Handle JSON body
      ({ username, email, bio, location, website, profile_private, social_links, visibility_options } = req.body);
    }

    // Check if username is being changed and if it's available
    if (username) {
      const existingUser = await db.get(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [username, decoded.userId]
      );
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    // Check if email is being changed and if it's available
    if (email) {
      const existingUser = await db.get(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, decoded.userId]
      );
      if (existingUser) {
        return res.status(400).json({ error: "Email already taken" });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (username) {
      updates.push("username = ?");
      values.push(username);
    }
    if (email) {
      updates.push("email = ?");
      values.push(email);
    }
    if (bio !== undefined) {
      updates.push("bio = ?");
      values.push(bio);
    }
    if (location !== undefined) {
      updates.push("location = ?");
      values.push(location);
    }
    if (website !== undefined) {
      updates.push("website = ?");
      values.push(website);
    }
    if (profile_private !== undefined) {
      updates.push("profile_private = ?");
      values.push(profile_private ? 1 : 0);
    }
    if (social_links !== undefined) {
      updates.push("social_links = ?");
      values.push(JSON.stringify(social_links));
    }
    if (visibility_options !== undefined) {
      updates.push("visibility_options = ?");
      values.push(JSON.stringify(visibility_options));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(decoded.userId);

    await db.run(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // Fetch updated user
    const updatedUser = await db.get(
      `SELECT 
        id, 
        username, 
        email, 
        tier, 
        profile_picture, 
        bio,
        location,
        website,
        banner,
        social_links,
        visibility_options,
        profile_private,
        created_at 
      FROM users 
      WHERE id = ?`,
      [decoded.userId]
    );

    // Parse JSON fields
    let socialLinks = {};
    let visibilityOptions = {};
    try {
      socialLinks = updatedUser.social_links ? JSON.parse(updatedUser.social_links) : {};
    } catch (e) {
      // Ignore parse errors
    }
    try {
      visibilityOptions = updatedUser.visibility_options ? JSON.parse(updatedUser.visibility_options) : {};
    } catch (e) {
      // Ignore parse errors
    }

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      tier: updatedUser.tier || "free",
      profile_picture: updatedUser.profile_picture || null,
      bio: updatedUser.bio || null,
      location: updatedUser.location || null,
      website: updatedUser.website || null,
      banner: updatedUser.banner || null,
      social_links: socialLinks,
      visibility_options: visibilityOptions,
      profile_private: updatedUser.profile_private || false,
      created_at: updatedUser.created_at,
    });
  } catch (error) {
    console.error("PUT /api/users/me error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

module.exports = router;

