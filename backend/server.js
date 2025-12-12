const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// CORS Configuration
const allowedOrigins = [
  "https://www.blueprintcad.io",
  "https://blueprintcad.io",
  "http://localhost:3000",
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

// Cookie parser (must come before routes)
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", require("./routes/auth"));
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