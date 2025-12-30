// backend/routes/oauth.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getOne, execute } = require("../lib/db");
const { generateToken } = require("../lib/auth");
const crypto = require("crypto");

// Generate a secure random state for OAuth
function generateState() {
  return crypto.randomBytes(32).toString("hex");
}

// Store state temporarily (in production, use Redis or similar)
const stateStore = new Map();

// Helper function to handle OAuth callback
async function handleOAuthCallback(provider, req, res) {
  try {
    const { code, state, error } = req.query;

    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL?.replace(':8080', ':3000') || "http://localhost:3000";

    if (error) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/login?error=missing_oauth_params`);
    }

    // Verify state
    const storedState = stateStore.get(state);
    if (!storedState || storedState.provider !== provider) {
      return res.redirect(`${frontendUrl}/login?error=invalid_state`);
    }

    stateStore.delete(state); // Clean up used state

    const { redirectUri } = storedState;

    let userInfo;
    let providerId;

    if (provider === "google") {
      // Exchange code for token
      const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8080"}/api/auth/oauth/google/callback`,
      });

      const { access_token } = tokenResponse.data;

      // Get user info
      const userResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      userInfo = userResponse.data;
      providerId = userInfo.id;
    } else if (provider === "github") {
      // Exchange code for token
      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: { Accept: "application/json" },
        }
      );

      const { access_token } = tokenResponse.data;

      // Get user info
      const userResponse = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      userInfo = userResponse.data;
      providerId = userInfo.id.toString();

      // Get email (may need separate call)
      let email = userInfo.email;
      if (!email) {
        try {
          const emailResponse = await axios.get("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          const primaryEmail = emailResponse.data.find((e) => e.primary);
          email = primaryEmail ? primaryEmail.email : emailResponse.data[0]?.email;
        } catch (emailError) {
          console.warn("Failed to fetch GitHub email:", emailError);
        }
      }
      userInfo.email = email;
    }

    if (!userInfo || !userInfo.email) {
      return res.redirect(`${frontendUrl}/login?error=oauth_email_required`);
    }

    // Check if user exists by OAuth ID
    const providerIdField = provider === "google" ? "google_id" : "github_id";
    let user = await getOne(
      `SELECT * FROM users WHERE ${providerIdField} = $1`,
      [providerId]
    );

    // If not found, check by email
    if (!user) {
      user = await getOne("SELECT * FROM users WHERE email = $1", [userInfo.email]);
    }

    if (user) {
      // Update existing user with OAuth info if missing
      if (!user[providerIdField]) {
        await execute(
          `UPDATE users SET ${providerIdField} = $1, oauth_provider = $2 WHERE id = $3`,
          [providerId, provider, user.id]
        );
      }
    } else {
      // Create new user
      // Generate username from email or name
      let username = userInfo.login || userInfo.name || userInfo.email.split("@")[0];
      username = username.toLowerCase().replace(/[^a-z0-9_]/g, "_");

      // Ensure username is unique
      let uniqueUsername = username;
      let counter = 1;
      while (await getOne("SELECT id FROM users WHERE username = $1", [uniqueUsername])) {
        uniqueUsername = `${username}_${counter}`;
        counter++;
      }

      const result = await execute(
        `INSERT INTO users (username, email, ${providerIdField}, oauth_provider, tier, profile_picture, created_at)
         VALUES ($1, $2, $3, $4, 'free', $5, NOW())
         RETURNING id`,
        [
          uniqueUsername,
          userInfo.email,
          providerId,
          provider,
          userInfo.avatar_url || userInfo.picture || null,
        ]
      );

      user = {
        id: result.rows[0].id,
        username: uniqueUsername,
        email: userInfo.email,
        [providerIdField]: providerId,
        oauth_provider: provider,
      };
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend callback handler with token
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&oauth=success&redirect=${encodeURIComponent(redirectUri)}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL?.replace(':8080', ':3000') || "http://localhost:3000";
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
}

// Explicit callback routes (must be before /:provider route)
router.get("/github/callback", (req, res) => handleOAuthCallback("github", req, res));
router.get("/google/callback", (req, res) => handleOAuthCallback("google", req, res));

// GET /api/auth/oauth/:provider - Initiate OAuth flow
router.get("/:provider", async (req, res) => {
  try {
    const { provider } = req.params;
    const redirectUri = req.query.redirect_uri || "/dashboard";

    if (!["google", "github"].includes(provider)) {
      return res.status(400).json({ error: "Invalid OAuth provider" });
    }

    const state = generateState();
    stateStore.set(state, { provider, redirectUri, timestamp: Date.now() });

    // Clean up old states (older than 10 minutes)
    for (const [key, value] of stateStore.entries()) {
      if (Date.now() - value.timestamp > 10 * 60 * 1000) {
        stateStore.delete(key);
      }
    }

    let authUrl;

    if (provider === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8080"}/api/auth/oauth/google/callback`;
      
      if (!clientId) {
        return res.status(500).json({ error: "Google OAuth not configured" });
      }

      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent("openid email profile")}&` +
        `state=${state}&` +
        `access_type=offline&` +
        `prompt=consent`;
    } else if (provider === "github") {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8080"}/api/auth/oauth/github/callback`;
      
      if (!clientId) {
        return res.status(500).json({ error: "GitHub OAuth not configured" });
      }

      authUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
        `scope=${encodeURIComponent("user:email")}&` +
        `state=${state}`;
    }

    res.redirect(authUrl);
  } catch (error) {
    console.error("OAuth initiation error:", error);
    res.status(500).json({ error: "Failed to initiate OAuth" });
  }
});

module.exports = router;

