// backend/routes/users.js
const express = require("express");
const router = express.Router();
const { getOne, getAll, execute } = require("../lib/db");
const { getUserFromRequest } = require("../lib/auth");

// GET /api/users/me - Get current user
router.get("/me", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user from PostgreSQL
    const user = await getOne(
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
      WHERE id = $1`,
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Parse JSON fields (PostgreSQL stores JSONB as objects, but handle text too)
    let socialLinks = {};
    let visibilityOptions = {};
    try {
      if (typeof user.social_links === 'string') {
        socialLinks = user.social_links ? JSON.parse(user.social_links) : {};
      } else {
        socialLinks = user.social_links || {};
      }
    } catch (e) {
      // Ignore parse errors
    }
    try {
      if (typeof user.visibility_options === 'string') {
        visibilityOptions = user.visibility_options ? JSON.parse(user.visibility_options) : {};
      } else {
        visibilityOptions = user.visibility_options || {};
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Get user stats
    const stats = await getOne(
      `SELECT 
        COUNT(DISTINCT p.id)::int as total_projects,
        COUNT(DISTINCT cf.id)::int as total_files
      FROM users u
      LEFT JOIN projects p ON p.user_id = u.id
      LEFT JOIN cad_files cf ON cf.user_id = u.id
      WHERE u.id = $1`,
      [decoded.userId]
    );

    // Calculate storage used (sum of file sizes)
    const storageResult = await getOne(
      `SELECT COALESCE(SUM(file_size), 0)::bigint as storage_used
       FROM cad_files
       WHERE user_id = $1`,
      [decoded.userId]
    );

    // Build public URLs for profile picture and banner if R2 is used
    const publicBase = process.env.R2_PUBLIC_URL
      ? process.env.R2_PUBLIC_URL.replace(/\/$/, "")
      : null;
    const profilePictureUrl =
      publicBase && user.profile_picture
        ? `${publicBase}/${user.profile_picture}`
        : null;
    const bannerUrl =
      publicBase && user.banner ? `${publicBase}/${user.banner}` : null;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      tier: user.tier || "free",
      profile_picture: user.profile_picture || null,
      profile_picture_url: profilePictureUrl,
      bio: user.bio || null,
      location: user.location || null,
      website: user.website || null,
      banner: user.banner || null,
      banner_url: bannerUrl,
      social_links: socialLinks,
      visibility_options: visibilityOptions,
      profile_private: user.profile_private || false,
      created_at: user.created_at,
      stats: {
        total_projects: stats?.total_projects || 0,
        total_files: stats?.total_files || 0,
        storage_used: Number(storageResult?.storage_used) || 0,
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
    
    // Handle JSON body only (file uploads happen via /api/upload/profile)
    const {
      username,
      email,
      bio,
      location,
      website,
      profile_private,
      social_links,
      visibility_options,
      profile_picture,
      banner,
    } = req.body || {};

    // Check if username is being changed and if it's available
    if (username) {
      const existingUser = await getOne(
        "SELECT id FROM users WHERE username = $1 AND id != $2",
        [username, decoded.userId]
      );
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    // Check if email is being changed and if it's available
    if (email) {
      const existingUser = await getOne(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email, decoded.userId]
      );
      if (existingUser) {
        return res.status(400).json({ error: "Email already taken" });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (username) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(bio);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    if (website !== undefined) {
      updates.push(`website = $${paramIndex++}`);
      values.push(website);
    }
    if (profile_private !== undefined) {
      updates.push(`profile_private = $${paramIndex++}`);
      values.push(profile_private);
    }
    if (social_links !== undefined) {
      updates.push(`social_links = $${paramIndex++}`);
      values.push(JSON.stringify(social_links));
    }
    if (visibility_options !== undefined) {
      updates.push(`visibility_options = $${paramIndex++}`);
      values.push(JSON.stringify(visibility_options));
    }
    if (profile_picture !== undefined) {
      updates.push(`profile_picture = $${paramIndex++}`);
      values.push(profile_picture);
    }
    if (banner !== undefined) {
      updates.push(`banner = $${paramIndex++}`);
      values.push(banner);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(decoded.userId);
    const whereClause = `WHERE id = $${paramIndex}`;

    try {
      await execute(
        `UPDATE users SET ${updates.join(", ")} ${whereClause}`,
        values
      );
    } catch (dbError) {
      console.error('Database update error:', dbError);
      console.error('Query:', `UPDATE users SET ${updates.join(", ")} ${whereClause}`);
      console.error('Values:', values);
      return res.status(500).json({ error: "Failed to update user in database" });
    }

    // Fetch updated user
    const updatedUser = await getOne(
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
      WHERE id = $1`,
      [decoded.userId]
    );

    // Parse JSON fields
    let socialLinks = {};
    let visibilityOptions = {};
    try {
      if (typeof updatedUser.social_links === 'string') {
        socialLinks = updatedUser.social_links ? JSON.parse(updatedUser.social_links) : {};
      } else {
        socialLinks = updatedUser.social_links || {};
      }
    } catch (e) {
      // Ignore parse errors
    }
    try {
      if (typeof updatedUser.visibility_options === 'string') {
        visibilityOptions = updatedUser.visibility_options ? JSON.parse(updatedUser.visibility_options) : {};
      } else {
        visibilityOptions = updatedUser.visibility_options || {};
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Build public URLs for profile picture and banner if R2 is used
    const publicBase = process.env.R2_PUBLIC_URL
      ? process.env.R2_PUBLIC_URL.replace(/\/$/, "")
      : null;
    const profilePictureUrl =
      publicBase && updatedUser.profile_picture
        ? `${publicBase}/${updatedUser.profile_picture}`
        : null;
    const bannerUrl =
      publicBase && updatedUser.banner ? `${publicBase}/${updatedUser.banner}` : null;

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      tier: updatedUser.tier || "free",
      profile_picture: updatedUser.profile_picture || null,
      profile_picture_url: profilePictureUrl,
      bio: updatedUser.bio || null,
      location: updatedUser.location || null,
      website: updatedUser.website || null,
      banner: updatedUser.banner || null,
      banner_url: bannerUrl,
      social_links: socialLinks,
      visibility_options: visibilityOptions,
      profile_private: updatedUser.profile_private || false,
      created_at: updatedUser.created_at,
    });
  } catch (error) {
    console.error("PUT /api/users/me error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to update user", details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Proxy to serve profile pictures from R2 while keeping existing frontend URLs working
router.get("/profile-picture/:key(*)", async (req, res) => {
  try {
    const publicBase = process.env.R2_PUBLIC_URL;
    if (!publicBase) {
      return res.status(404).send("Profile pictures not configured");
    }
    const base = publicBase.replace(/\/$/, "");
    const key = req.params.key;
    const url = `${base}/${key}`;
    return res.redirect(302, url);
  } catch (error) {
    console.error("GET /api/users/profile-picture error:", error);
    res.status(500).send("Failed to load profile picture");
  }
});

// Proxy to serve banners from R2 while keeping existing frontend URLs working
router.get("/banner/:key(*)", async (req, res) => {
  try {
    const publicBase = process.env.R2_PUBLIC_URL;
    if (!publicBase) {
      return res.status(404).send("Banners not configured");
    }
    const base = publicBase.replace(/\/$/, "");
    const key = req.params.key;
    const url = `${base}/${key}`;
    return res.redirect(302, url);
  } catch (error) {
    console.error("GET /api/users/banner error:", error);
    res.status(500).send("Failed to load banner image");
  }
});

// GET /api/users/:username - Get user by username (for profile pages)
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const decoded = getUserFromRequest(req); // Optional - for checking if viewing own profile

    // Get user from PostgreSQL
    const user = await getOne(
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
      WHERE username = $1`,
      [username]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Parse JSON fields
    let socialLinks = {};
    let visibilityOptions = {};
    try {
      if (typeof user.social_links === 'string') {
        socialLinks = user.social_links ? JSON.parse(user.social_links) : {};
      } else {
        socialLinks = user.social_links || {};
      }
    } catch (e) {
      // Ignore parse errors
    }
    try {
      if (typeof user.visibility_options === 'string') {
        visibilityOptions = user.visibility_options ? JSON.parse(user.visibility_options) : {};
      } else {
        visibilityOptions = user.visibility_options || {};
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Only return email if viewing own profile or if visibility allows
    const isOwnProfile = decoded && decoded.userId === user.id;
    const showEmail = isOwnProfile || (visibilityOptions?.showEmail !== false);

    // Build public URLs for profile picture and banner if R2 is used
    const publicBase = process.env.R2_PUBLIC_URL
      ? process.env.R2_PUBLIC_URL.replace(/\/$/, "")
      : null;
    const profilePictureUrl =
      publicBase && user.profile_picture
        ? `${publicBase}/${user.profile_picture}`
        : null;
    const bannerUrl =
      publicBase && user.banner ? `${publicBase}/${user.banner}` : null;

    res.json({
      id: user.id,
      username: user.username,
      email: showEmail ? user.email : null,
      tier: user.tier || "free",
      profile_picture: user.profile_picture || null,
      profile_picture_url: profilePictureUrl,
      bio: user.bio || null,
      location: user.location || null,
      website: user.website || null,
      banner: user.banner || null,
      banner_url: bannerUrl,
      social_links: socialLinks,
      visibility_options: visibilityOptions,
      profile_private: user.profile_private || false,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error("GET /api/users/:username error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

module.exports = router;
