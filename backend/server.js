const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load repo-root .env.local / .env so Express sees DATABASE_URL, JWT_SECRET, R2_* (same as Next).
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

// Re-apply DATABASE_* from .env.local so a shell-exported Railway internal URL cannot override the file.
try {
  const envLocal = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envLocal)) {
    const parsed = dotenv.parse(fs.readFileSync(envLocal, "utf8"));
    if (parsed.DATABASE_URL) {
      process.env.DATABASE_URL = parsed.DATABASE_URL;
    }
    // Public URL last so it wins over a pasted internal DATABASE_URL in the same file
    const pub =
      parsed.DATABASE_PUBLIC_URL ||
      parsed.POSTGRES_PUBLIC_URL ||
      parsed.RAILWAY_DATABASE_PUBLIC_URL;
    if (pub) {
      process.env.DATABASE_PUBLIC_URL = pub;
    }
  }
} catch (err) {
  console.warn("[env] Could not re-apply DATABASE_* from .env.local:", err.message);
}

// Validate DB URL early (getPool logs host in development on first init)
try {
  const { getPool } = require("./lib/db");
  getPool();
} catch (e) {
  console.error("\n" + e.message + "\n");
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// CORS Configuration
const allowedOrigins = [
  "https://www.blueprintcad.io",
  "https://blueprintcad.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Required for browser preflight requests
app.options("*", cors());

// Stripe webhooks must receive the raw request body for signature verification.
// Mount this BEFORE JSON/body parsing middleware.
app.use("/api/stripe", require("./routes/stripe"));

// Cookie parser (must come before routes)
app.use(cookieParser());

// Body parsing middleware - skip for multipart/form-data (handled by formidable)
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return next(); // Skip body parsing for FormData
  }
  express.json({ limit: "50mb" })(req, res, next);
});

app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return next(); // Skip body parsing for FormData
  }
  express.urlencoded({ extended: true, limit: "50mb" })(req, res, next);
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/auth/oauth", require("./routes/oauth"));
app.use("/api/cad", require("./routes/cad"));
app.use("/api/users", require("./routes/users"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/subscriptions", require("./routes/subscriptions"));
app.use("/api/storefront", require("./routes/storefront"));
app.use("/api/folders", require("./routes/folders"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/files", require("./routes/files"));
app.use("/api/thumbnails", require("./routes/thumbnails"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/waitlist", require("./routes/waitlist"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/email-campaigns", require("./routes/email-campaigns"));
app.use("/api/test-email", require("./routes/test-email"));

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Blueprint Backend API",
    version: "1.0.0",
    status: "running"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});