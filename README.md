# AI Chatbot (Static Web App)

A lightweight, modern chat UI built with Tailwind CSS that streams responses from OpenAI's Responses API. Your API key is stored locally in the browser.

## Quick Start

- Open `index.html` directly in your browser, or serve the folder with any static server.
- Click "Settings" and paste your OpenAI API key (stored in localStorage).
- Pick a model (default `gpt-4o-mini`).
- Type a message and press Enter.

## Features

- Streaming responses for low-latency typing feel
- Tailwind CSS UI (CDN)
- System prompt and model selection
- New chat reset
- Markdown rendering (via `marked` CDN)
- Local-only storage of your API key

## Notes

- This app talks directly to `https://api.openai.com/v1/responses` using your key.
- If your network blocks cross-origin requests, serve the files with a local server (e.g. `npx serve`).
- To change default model or prompt, use the left sidebar.

## Privacy

- The API key is stored in `localStorage` under `openai_api_key` and never leaves your browser except in requests to OpenAI.

## Optional: Run a local server

```bash
npx serve .
```

Then visit the served URL in your browser.

## Secure setup with a proxy server (recommended)

To avoid exposing your API key in the browser, run the included Node proxy:

1. Create a `.env` file next to `server.js` with:

```
OPENAI_API_KEY=sk-...
```

2. Install deps and start the server:

```bash
cd /Users/ekata.patiye/Desktop/genai
npm install
npm run dev
```

3. Open `http://localhost:3000`. In Settings, leave the API key empty to use the proxy.

### Deploy

- Vercel (recommended):
  - Ensure `api/responses.js` and `vercel.json` are present (they are).
  - Set project env var `OPENAI_API_KEY`.
  - Deploy. The app uses `/api/responses` automatically.

- Netlify:
  - `netlify.toml` and `netlify/functions/responses.js` are included.
  - Set env var `OPENAI_API_KEY` in site settings.
  - Deploy. Requests to `/api/responses` will be proxied via the function.
