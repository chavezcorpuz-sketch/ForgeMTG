# ForgeMTG Server - OCR + card matching

Requirements:
- Node 16+
- Google Cloud service account JSON with Vision API enabled
  - Save JSON file locally and set env var:
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"

Install & run:
cd server
npm install
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
node server.js

If you're testing on a phone using Expo, use your machine's LAN IP in client config (replace SERVER_URL in client components).
