import express from "express";
import axios from "axios";
import rateLimit from "express-rate-limit"; // Import rate limit
import { extractPinterestMedia } from "./extractMedia.js";

const app = express();
const PORT = 3000;

// Rate Limiter Configuration
const limiter = rateLimit({
    windowMs: 1000, // 1 second
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1, // Limit each IP to 1 request per second (default)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        error: "Too many requests, please try again later.",
    },
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

// Make sure to trust proxy if running behind a reverse proxy (like Docker/Nginx often implies)
app.set('trust proxy', 1);

// Simple request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

/**
 * Root Page: Usage Guide (Dynamic URL)
 */
app.get("/", (req, res) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pinterest Downloader API</title>
  <style>
    :root { --bg: #0f172a; --text: #f8fafc; --accent: #38bdf8; --code-bg: #1e293b; }
    body { font-family:system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    h1 { margin-bottom: 0.5rem; font-size: 2.5rem; }
    p { opacity: 0.8; max-width: 600px; line-height: 1.6; }
    .card { background: var(--code-bg); padding: 2rem; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 2rem; max-width: 100%; width: 600px; text-align: left; }
    code { font-family: 'Fira Code', 'Courier New', monospace; color: var(--accent); white-space: pre-wrap; word-break: break-all; }
    .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: bold; margin-bottom: 0.5rem; display: block; }
  </style>
</head>
<body>
  <h1>Pinterest Downloader API 🗿</h1>
  <p>A high-performance, privacy-focused API to extract high-quality media (Video, Images, Story Pins) from Pinterest.</p>
  
  <div class="card">
    <span class="label">Universal Resolver Endpoint</span>
    <code>curl "${baseUrl}/resolve?url=https://pin.it/2u9bHtUx6"</code>
  </div>

  <p style="margin-top: 2rem; font-size: 0.875rem; opacity: 0.5;">
    Rate Limit: ${process.env.RATE_LIMIT_MAX || 1} req/sec • No Login Required
  </p>
</body>
</html>
  `;

    res.send(html);
});

/**
 * Resolve Pinterest link → JSON (direct URL)
 */
app.get("/resolve", async (req, res) => {
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
