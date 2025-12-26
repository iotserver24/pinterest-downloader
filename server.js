import express from "express";
import axios from "axios";
import { extractPinterestMedia } from "./extractMedia.js";

const app = express();
const PORT = 3000;

// Simple request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
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

/**
 * Force download Pinterest media
 * Note: For multi-item pins, this currently downloads the FIRST item.
 */
app.get("/download", async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).send("Missing url parameter");
        }

        const media = await extractPinterestMedia(url);

        // Handle new standardized format (items array)
        if (!media.items || media.items.length === 0) {
            throw new Error("No media items found");
        }

        // Default to the first item for forced single-file download
        const targetItem = media.items[0];

        const response = await axios.get(targetItem.url, {
            responseType: "stream",
        });

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=pinterest_${Date.now()}.${targetItem.format}`
        );

        response.data.pipe(res);
    } catch (err) {
        console.error("Download error:", err);
        res.status(500).send("Download failed: " + err.message);
    }
});

app.listen(PORT, () => {
    console.log(`🔥 Pinterest downloader running on http://localhost:${PORT}`);
});
