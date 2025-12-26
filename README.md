# Pinterest Media Downloader API

A robust, Docker-ready API to extract high-quality media (Video, Image, GIF, Story Pins) from Pinterest URLs without authentication or API keys.

**Repository:** [https://github.com/iotserver24/pinterest-downloader](https://github.com/iotserver24/pinterest-downloader)

## 🚀 Features

* **Universal Support**: Handles Standard Pins, Videos, GIFs, Carousels, and Story Pins (Idea Pins).
* **Dual-Strategy Extraction**: Uses both Redux state and Relay data scraping for maximum reliability.
* **Privacy Focused**: No login, cookies, or tracking required.
* **Standardized JSON**: Returns a clean, consistent JSON response.
* **Rate Limiting**: Built-in IP-based rate limiting (Default: 1 req/sec) to prevent abuse.
* **Docker Ready**: Simple `Dockerfile` included for easy deployment.

## 🛠️ Installation

### 1. Run with Docker (Recommended)

```bash
# Build the image
docker build -t pinterest-downloader .

# Run container (Limit: 5 requests / second)
docker run -d -p 3000:3000 --env RATE_LIMIT_MAX=5 pinterest-downloader
```

### 2. Run Locally

```bash
# Install dependencies
npm install

# Start server
npm start
```

## 🔌 API Documentation

### Resolve Pin Media

**Endpoint:** `GET /resolve`

**Query Parameters:**

* `url` (required): The Pinterest Pin URL (e.g., `https://pin.it/...` or `https://pinterest.com/pin/...`)

**Example Request:**

```bash
curl "http://localhost:3000/resolve?url=https://pin.it/2u9bHtUx6"
```

**Example Response:**

```json
{
  "type": "video",
  "items": [
    { 
      "type": "video", 
      "format": "mp4", 
      "url": "https://v1.pinimg.com/videos/iht/expMp4/...",
      "poster": "https://i.pinimg.com/..."
    }
  ]
}
```

### Force Download (File)

**Endpoint:** `GET /download`

Downloads the media file directly. if multiple items exist, downloads the first one.

**Example:**
`http://localhost:3000/download?url=https://pin.it/2u9bHtUx6`

## ⚙️ Configuration

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port to run the server on. |
| `RATE_LIMIT_MAX` | `1` | Max requests per IP per second. |

## ⚠️ Disclaimer

This project is for educational purposes only. It is not affiliated with, endorsed, or sponsored by Pinterest. Use responsibly and respect Pinterest's Terms of Service and content creators' rights.
