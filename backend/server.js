const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// FIXED CORS CONFIG
app.use(cors({
  origin: ["https://www.blueprintcad.io"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Required for browser preflight requests
app.options("*", cors());

app.use(express.json());

// Dynamically load all backend routes
const mountRoutes = require("./routes");
mountRoutes(app);

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Blueprint Backend is Live");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});