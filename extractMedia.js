import axios from "axios";
import * as cheerio from "cheerio";

export async function extractPinterestMedia(pinUrl) {
    try {
        const { data: html, request } = await axios.get(pinUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.pinterest.com/",
            },
            maxRedirects: 10,
        });

        const $ = cheerio.load(html);
        let pinData = null;

        // ---------------------------------------------------------
        // 1. DATA EXTRACTION (Dual Strategy)
        // ---------------------------------------------------------

        // Strategy A: Redux State
        const jsonText = $("#__PWS_DATA__").html();
        if (jsonText) {
            try {
                const data = JSON.parse(jsonText);
                const pins = data?.props?.initialReduxState?.pins;
                if (pins && Object.keys(pins).length > 0) {
                    pinData = pins[Object.keys(pins)[0]];
                }
            } catch (e) { }
        }

        // Strategy B: Relay Data (Script Scan)
        if (!pinData) {
            $("script").each((i, el) => {
                const content = $(el).html();
                if (content && content.includes("window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__")) {
                    try {
                        const startIdx = content.indexOf(", {");
                        const endIdx = content.lastIndexOf("});");
                        if (startIdx !== -1 && endIdx !== -1) {
                            const jsonString = content.substring(startIdx + 2, endIdx + 1);
                            const data = JSON.parse(jsonString);
                            if (data?.data?.v3GetPinQuery?.data) {
                                pinData = data.data.v3GetPinQuery.data;
                                return false;
                            }
                        }
                    } catch (e) { }
                }
            });
        }

        if (!pinData) {
            throw new Error("Pin data not found");
        }

        // ---------------------------------------------------------
        // 2. PARSING LOGIC (Universal Support)
        // ---------------------------------------------------------

        const items = [];
        const hotspots = [];

        // Helper to add item
        const addItem = (type, url) => {
            if (!url) return;
            let format = "jpg";
            if (type === "video") {
                format = url.includes(".m3u8") ? "m3u8" : "mp4";
            } else if (url.indexOf(".gif") !== -1) {
                // GIF detection
                type = "gif";
                format = "gif";
            }
            items.push({ type, format, url });
        };

        // A. STORY PINS / IDEA PINS (Multi-Page)
        const storyData = pinData.storyPinData || pinData.story_pin_data;
        if (storyData && storyData.pages) {
            for (const page of storyData.pages) {
                if (page.blocks) {
                    for (const block of page.blocks) {
                        // Video Block
                        const videoObj = block.videoDataV2 || block.video;
                        if (videoObj) {
                            const videoList = videoObj.videoList || videoObj.video_list || {};
                            const videoList720 = videoObj.videoList720P || {};
                            const v =
                                videoList720["v720P"] ||
                                videoList["V_720P"] ||
                                videoList["vHLSV3MOBILE"] ||
                                videoList["vHLSV4"] ||
                                videoList["V_FULL_HD"];

                            if (v?.url) addItem("video", v.url);
                        }
                        // Image Block
                        const imageObj = block.image;
                        if (imageObj?.images?.orig?.url) {
                            addItem("image", imageObj.images.orig.url);
                        }
                    }
                }
            }
        }

        // B. REMOVED CAROUSEL (User Request)

        // C. STANDARD VIDEO
        if (items.length === 0 && pinData.videos && pinData.videos.video_list) {
            const v =
                pinData.videos.video_list.V_720P ||
                pinData.videos.video_list.V_480P ||
                pinData.videos.video_list.V_360P;
            if (v?.url) addItem("video", v.url);
        }

        // D. STANDARD IMAGE (Fallback)
        if (items.length === 0) {
            const image =
                pinData.images?.orig ||
                pinData.images?.["736x"] ||
                pinData.images?.["564x"] ||
                pinData.imageSpec_orig ||
                pinData.images_orig;

            if (image?.url) {
                addItem("image", image.url);
            }
        }

        // E. HOTSPOTS
        if (pinData.hotspots) {
            for (const h of pinData.hotspots) {
                if (h.link?.url) {
                    // Ensure full URL if relative
                    const fullUrl = h.link.url.startsWith("http") ? h.link.url : `https://www.pinterest.com${h.link.url}`;
                    hotspots.push({ pin_url: fullUrl });
                }
            }
        }

        // ---------------------------------------------------------
        // 3. RESPONSE CONSTRUCTION
        // ---------------------------------------------------------

        if (items.length === 0) {
            throw new Error("No media items found");
        }

        // Determine high-level type
        let finalType = "image";
        if (items.length > 1) {
            finalType = "multi"; // Story
        } else if (items[0].type === "video") {
            finalType = "video";
        } else if (items[0].type === "gif") {
            finalType = "gif";
        }

        const response = {
            type: finalType,
            items: items
        };

        if (hotspots.length > 0) {
            response.hotspots = hotspots;
        }

        return response;

    } catch (err) {
        throw new Error(`Failed to resolve Pinterest media: ${err.message}`);
    }
}
