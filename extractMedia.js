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
        // STRATEGY 1: #__PWS_DATA__ (Redux State)
        // ---------------------------------------------------------
        const jsonText = $("#__PWS_DATA__").html();
        if (jsonText) {
            try {
                const data = JSON.parse(jsonText);
                const pins = data?.props?.initialReduxState?.pins;
                if (pins && Object.keys(pins).length > 0) {
                    pinData = pins[Object.keys(pins)[0]];
                }
            } catch (e) {
                // ignore
            }
        }

        // ---------------------------------------------------------
        // STRATEGY 2: Relay Data in Script
        // ---------------------------------------------------------
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
                    } catch (e) {
                        // ignore
                    }
                }
            });
        }

        if (!pinData) {
            throw new Error(`Pin data not found. URL: ${request.res.responseUrl}`);
        }

        // ---------------------------------------------------------
        // EXTRACT MEDIA
        // ---------------------------------------------------------

        let videoUrl = null;
        let videoPoster = null;

        // A. Standard Video
        if ((pinData.videos && pinData.videos.video_list) || (pinData.story_pin_data && !pinData.story_pin_data.pages)) {
            const videoList = pinData.videos?.video_list || pinData.story_pin_data?.blocks?.[0]?.video?.video_list;

            if (videoList) {
                const video =
                    videoList.V_720P ||
                    videoList.V_480P ||
                    videoList.V_360P;

                if (video) {
                    videoUrl = video.url;
                    videoPoster = pinData.images?.orig?.url;
                }
            }
        }

        // B. Story Pin / Idea Pin Video (Pages)
        if (!videoUrl) {
            const storyData = pinData.storyPinData || pinData.story_pin_data;

            if (storyData && storyData.pages) {
                for (const page of storyData.pages) {
                    if (page.blocks) {
                        for (const block of page.blocks) {
                            // Try all known video locations: videoDataV2 (Relay) or video (Redux)
                            const videoObj = block.videoDataV2 || block.video;

                            if (videoObj) {
                                const videoList = videoObj.videoList || videoObj.video_list || {};
                                const videoList720 = videoObj.videoList720P || {};

                                const video =
                                    videoList720["v720P"] ||
                                    videoList["V_720P"] ||
                                    videoList["vHLSV3MOBILE"] ||
                                    videoList["vHLSV4"];

                                if (video && video.url) {
                                    videoUrl = video.url;
                                    videoPoster = videoObj.videoListMobile?.vHLSV3MOBILE?.thumbnail || block.image?.url;
                                    break;
                                }
                            }
                        }
                    }
                    if (videoUrl) break;
                }
            }
        }

        if (videoUrl) {
            return {
                type: "video",
                format: videoUrl.includes(".m3u8") ? "m3u8" : "mp4",
                url: videoUrl,
                poster: videoPoster
            };
        }

        // 🖼 IMAGE
        const image =
            pinData.images?.orig ||
            pinData.images?.["736x"] ||
            pinData.images?.["564x"] ||
            pinData.imageSpec_orig ||
            pinData.images_orig;

        if (image) {
            return {
                type: "image",
                format: "jpg",
                url: image.url,
            };
        }

        throw new Error("No usable media found in Pin data");

    } catch (err) {
        console.error("Extraction error:", err);
        throw new Error(`Failed to resolve Pinterest media: ${err.message}`);
    }
}
