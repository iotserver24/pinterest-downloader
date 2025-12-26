import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { extractPinterestMedia } from "./extractMedia.js";

// Helper for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Rate Limiter Configuration
const limiter = rateLimit({
    windowMs: 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
});

// Apply rate limiting middleware ONLY to the API endpoint
// app.use(limiter); <--- REMOVED GLOBAL APPLICATION

// Make sure to trust proxy if running behind a reverse proxy
app.set('trust proxy', 1);

// Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve openapi.json (No Rate Limit)
app.get("/openapi.json", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, "openapi.json"));
});

// Root: Scalar API Documentation (No Rate Limit)
app.get("/", (req, res) => {
    const html = `
<!doctype html>
<html>
  <head>
    <title>Pinterest Downloader API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <!-- Scalar API Reference -->
    <script
      id="api-reference"
      data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
  `;
    res.send(html);
});

// API Endpoint (Rate Limited)
app.get("/resolve", limiter, async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: "Missing url parameter" });
        }

        const media = await extractPinterestMedia(url);
        res.json(media);
    } catch (err) {
        res.status(500).json({
            error: "Failed to resolve Pinterest media",
            message: err.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`🔥 Pinterest downloader running on http://localhost:${PORT}`);
});
