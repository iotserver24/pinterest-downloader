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
 */
app.get("/download", async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).send("Missing url parameter");
        }

        const media = await extractPinterestMedia(url);

        const response = await axios.get(media.url, {
            responseType: "stream",
        });

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=pinterest.${media.format}`
        );

        response.data.pipe(res);
    } catch (err) {
        res.status(500).send("Download failed");
    }
});

app.listen(PORT, () => {
    console.log(`🔥 Pinterest downloader running on http://localhost:${PORT}`);
});
