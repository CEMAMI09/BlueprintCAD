// backend/routes/storefront.js — CRUD for seller storefronts (PostgreSQL + R2)
const express = require("express");
const router = express.Router();
const formidableLib = require("formidable");
const formidable = formidableLib.formidable || formidableLib;
const fs = require("fs");
const path = require("path");
const { getUserFromRequest } = require("../lib/auth");
const { getOne, execute } = require("../lib/db");
const { uploadToR2, generateUserAssetKey } = require("../lib/r2");

let ensuredTable = false;

async function ensureStorefrontsTable() {
  if (ensuredTable) return;
  await execute(`
    CREATE TABLE IF NOT EXISTS storefronts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      store_name TEXT NOT NULL DEFAULT 'My Store',
      tagline TEXT,
      description TEXT,
      banner_image TEXT,
      logo TEXT,
      primary_color TEXT DEFAULT '#3b82f6',
      secondary_color TEXT DEFAULT '#8b5cf6',
      accent_color TEXT DEFAULT '#10b981',
      custom_domain TEXT,
      featured_projects TEXT,
      pinned_products TEXT,
      focused_industry TEXT,
      bio TEXT,
      skills TEXT,
      social_links TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await execute(`ALTER TABLE storefronts ADD COLUMN IF NOT EXISTS focused_industry TEXT`);
  ensuredTable = true;
}

function parseJsonField(row, key) {
  if (!row || row[key] == null) return null;
  if (typeof row[key] === "object") return row[key];
  try {
    return JSON.parse(row[key]);
  } catch {
    return null;
  }
}

function rowToStorefrontPayload(row) {
  if (!row) return null;
  return {
    id: row.id,
    store_name: row.store_name,
    tagline: row.tagline,
    description: row.description,
    banner_image: row.banner_image,
    logo: row.logo,
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    accent_color: row.accent_color,
    custom_domain: row.custom_domain,
    featured_projects: parseJsonField(row, "featured_projects"),
    pinned_products: parseJsonField(row, "pinned_products"),
    focused_industry: row.focused_industry,
    bio: row.bio,
    skills: parseJsonField(row, "skills"),
    social_links: parseJsonField(row, "social_links"),
  };
}

function publicUrlForKey(key) {
  if (!key) return null;
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key}`;
}

// GET /api/storefront — current user's storefront (auth) + tier for subscription UI
router.get("/", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await ensureStorefrontsTable();

    const user = await getOne(
      "SELECT id, username, tier FROM users WHERE id = $1",
      [decoded.userId]
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = await getOne(
      "SELECT * FROM storefronts WHERE user_id = $1",
      [decoded.userId]
    );

    const tier = user.tier || "free";
    if (!row) {
      return res.json({
        tier,
        username: user.username,
        store_name: "",
        description: "",
        tagline: "",
        banner_image: null,
        logo: null,
        primary_color: "#3b82f6",
        secondary_color: "#8b5cf6",
        accent_color: "#10b981",
        custom_domain: "",
        featured_projects: [],
        pinned_products: [],
        focused_industry: "",
        bio: null,
        skills: null,
        social_links: null,
      });
    }

    const payload = rowToStorefrontPayload(row);
    res.json({ ...payload, tier, username: user.username });
  } catch (error) {
    console.error("GET /api/storefront error:", error);
    res.status(500).json({ error: "Failed to fetch storefront" });
  }
});

// PUT + POST /api/storefront — create/update storefront (multipart).
// POST is the primary path: some reverse proxies block or mishandle PUT on /api routes.
async function saveStorefront(req, res) {
  try {
    const decoded = getUserFromRequest(req);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await ensureStorefrontsTable();

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 15 * 1024 * 1024,
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const str = (name) => {
      const v = fields[name];
      if (v == null) return "";
      return Array.isArray(v) ? v[0] : String(v);
    };

    const storeName = str("store_name").trim() || "My Store";
    const description = str("description");
    const primaryColor = str("primary_color") || "#3b82f6";
    const secondaryColor = str("secondary_color") || "#8b5cf6";
    const accentColor = str("accent_color") || "#10b981";
    const customDomain = str("custom_domain");
    const featuredProjects = str("featured_projects") || "[]";
    const focusedIndustry = str("focused_industry");

    const existing = await getOne(
      "SELECT * FROM storefronts WHERE user_id = $1",
      [decoded.userId]
    );

    let bannerKey = existing?.banner_image || null;
    let logoKey = existing?.logo || null;

    const bannerFile = files.banner_image;
    const banner = Array.isArray(bannerFile) ? bannerFile[0] : bannerFile;
    const logoFile = files.logo;
    const logo = Array.isArray(logoFile) ? logoFile[0] : logoFile;

    if (banner?.filepath) {
      const buf = await fs.promises.readFile(banner.filepath);
      const ct =
        banner.mimetype || banner.type || "image/jpeg";
      const key = generateUserAssetKey(
        decoded.userId,
        "storefront-banner",
        banner.originalFilename || path.basename(banner.filepath)
      );
      const { key: uploaded } = await uploadToR2(buf, key, ct);
      bannerKey = uploaded;
      try {
        await fs.promises.unlink(banner.filepath);
      } catch (_) {}
    }

    if (logo?.filepath) {
      const buf = await fs.promises.readFile(logo.filepath);
      const ct = logo.mimetype || logo.type || "image/png";
      const key = generateUserAssetKey(
        decoded.userId,
        "storefront-logo",
        logo.originalFilename || path.basename(logo.filepath)
      );
      const { key: uploaded } = await uploadToR2(buf, key, ct);
      logoKey = uploaded;
      try {
        await fs.promises.unlink(logo.filepath);
      } catch (_) {}
    }

    if (existing) {
      await execute(
        `UPDATE storefronts SET
          store_name = $1,
          description = $2,
          primary_color = $3,
          secondary_color = $4,
          accent_color = $5,
          custom_domain = $6,
          featured_projects = $7,
          focused_industry = $8,
          banner_image = $9,
          logo = $10,
          updated_at = NOW()
        WHERE user_id = $11`,
        [
          storeName,
          description,
          primaryColor,
          secondaryColor,
          accentColor,
          customDomain || null,
          featuredProjects,
          focusedIndustry || null,
          bannerKey,
          logoKey,
          decoded.userId,
        ]
      );
    } else {
      await execute(
        `INSERT INTO storefronts (
          user_id, store_name, description, primary_color, secondary_color, accent_color,
          custom_domain, featured_projects, focused_industry, banner_image, logo
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          decoded.userId,
          storeName,
          description,
          primaryColor,
          secondaryColor,
          accentColor,
          customDomain || null,
          featuredProjects,
          focusedIndustry || null,
          bannerKey,
          logoKey,
        ]
      );
    }

    const row = await getOne(
      "SELECT * FROM storefronts WHERE user_id = $1",
      [decoded.userId]
    );
    const user = await getOne(
      "SELECT tier, username FROM users WHERE id = $1",
      [decoded.userId]
    );

    const payload = rowToStorefrontPayload(row);
    const out = {
      ...payload,
      banner_image: publicUrlForKey(row.banner_image) || row.banner_image,
      logo: publicUrlForKey(row.logo) || row.logo,
      tier: user?.tier || "free",
      username: user?.username,
    };
    res.json(out);
  } catch (error) {
    console.error("PUT/POST /api/storefront error:", error);
    res.status(500).json({
      error: "Failed to save storefront",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

router.put("/", saveStorefront);
router.post("/", saveStorefront);

// GET /api/storefront/:username — public storefront bundle
router.get("/:username", async (req, res) => {
  try {
    await ensureStorefrontsTable();
    const username = req.params.username;
    if (!username || username === "undefined") {
      return res.status(400).json({ error: "Invalid username" });
    }

    const user = await getOne(
      `SELECT id, username, profile_picture, tier, created_at FROM users WHERE username = $1`,
      [username]
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = await getOne(
      "SELECT * FROM storefronts WHERE user_id = $1",
      [user.id]
    );
    if (!row) {
      return res.status(404).json({ error: "Storefront not found" });
    }

    const storefront = rowToStorefrontPayload(row);
    storefront.banner_image =
      publicUrlForKey(row.banner_image) || row.banner_image;
    storefront.logo = publicUrlForKey(row.logo) || row.logo;

    res.json({
      storefront,
      owner: {
        id: user.id,
        username: user.username,
        profile_picture: user.profile_picture,
        created_at: user.created_at,
        is_verified: false,
      },
      products: [],
      reviews: [],
      following: false,
    });
  } catch (error) {
    console.error("GET /api/storefront/:username error:", error);
    res.status(500).json({ error: "Failed to fetch storefront" });
  }
});

module.exports = router;
