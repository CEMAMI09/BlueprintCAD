// backend/routes/users.js
const express = require("express");
const router = express.Router();
const { getOne, getAll, execute } = require("../lib/db");
const { getUserFromRequest } = require("../lib/auth");
const formidable = require("formidable");

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
    
    // Handle both JSON and FormData
    let username, email, bio, location, website, profile_private, social_links, visibility_options;
    
    // Check if content-type is multipart/form-data
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      try {
        // Parse FormData using formidable v3
        const form = formidable({ 
          multiples: true,
          keepExtensions: true
        });
        
        // Formidable v3 returns { fields, files } object
        const { fields, files } = await form.parse(req);
        
        // Extract field values (formidable v3 returns arrays)
        username = Array.isArray(fields.username) ? fields.username[0] : fields.username;
        email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
        bio = Array.isArray(fields.bio) ? (fields.bio[0] || null) : (fields.bio || null);
        location = Array.isArray(fields.location) ? (fields.location[0] || null) : (fields.location || null);
        website = Array.isArray(fields.website) ? (fields.website[0] || null) : (fields.website || null);
        
        const profilePrivateValue = Array.isArray(fields.profile_private) ? fields.profile_private[0] : fields.profile_private;
        profile_private = profilePrivateValue === "true" || profilePrivateValue === true;
        
        // Parse JSON fields
        if (fields.social_links) {
          try {
            const socialLinksValue = Array.isArray(fields.social_links) ? fields.social_links[0] : fields.social_links;
            social_links = typeof socialLinksValue === 'string' 
              ? JSON.parse(socialLinksValue) 
              : socialLinksValue || {};
          } catch (e) {
            console.error('Error parsing social_links:', e);
            social_links = {};
          }
        }
        if (fields.visibility_options) {
          try {
            const visibilityValue = Array.isArray(fields.visibility_options) ? fields.visibility_options[0] : fields.visibility_options;
            visibility_options = typeof visibilityValue === 'string'
              ? JSON.parse(visibilityValue)
              : visibilityValue || {};
          } catch (e) {
            console.error('Error parsing visibility_options:', e);
            visibility_options = {};
          }
        }
        
        // File handling is stubbed - files are in the files object but not processed
        // In a full implementation, you would save profile_picture and banner files to R2 here
      } catch (formError) {
        console.error('Error parsing FormData:', formError);
        console.error('FormData error stack:', formError.stack);
        return res.status(400).json({ error: "Failed to parse form data", details: process.env.NODE_ENV === 'development' ? formError.message : undefined });
      }
    } else {
      // Handle JSON body
      ({ username, email, bio, location, website, profile_private, social_links, visibility_options } = req.body);
    }

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
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to update user", details: process.env.NODE_ENV === 'development' ? error.message : undefined });
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

    res.json({
      id: user.id,
      username: user.username,
      email: showEmail ? user.email : null,
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
    });
  } catch (error) {
    console.error("GET /api/users/:username error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

module.exports = router;
