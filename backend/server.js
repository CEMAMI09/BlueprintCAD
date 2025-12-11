const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://www.blueprintcad.io",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Required for browser preflight requests
app.options("*", cors());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
// API Routes
app.use("/auth", require("./routes/auth"));        // NEW
app.use("/api/auth", require("./routes/auth"));    // Keep old path working
app.use("/api/cad", require("./routes/cad"));
// Add more routes here as they are converted

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