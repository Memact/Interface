# Memact

Memact is a browser-first memory search app.

It captures what you read in Chromium-based browsers, stores that memory locally in the extension, and lets you search it from the Memact web app.

## What It Does

- Captures browser activity locally
- Extracts page text, snippets, and keyphrases
- Groups related activity into sessions
- Ranks memories with semantic match, lexical match, and recency
- Shows search results as cards with full extracted text on click

## Privacy

- Everything stays local by default
- No cloud APIs
- No remote AI calls
- No screenshots or keystroke capture

## Project Layout

- `src/` - React web app
- `extension/memact/` - Chromium extension
- `public/` - static web assets
- `assets/` - fonts and shared visual assets
- `memact_branding/` - brand logos and icons

## Run Locally

```powershell
npm install
npm run dev
```

To create a production build:

```powershell
npm run build
```

## Load The Extension

1. Open `chrome://extensions` or `edge://extensions`
2. Turn on Developer mode
3. Click `Load unpacked`
4. Select `extension/memact`
5. Reload the extension after code changes

Clicking the extension icon opens `https://www.memact.com`.

## Local Development Hosts

The extension can connect to:

- `http://localhost`
- `http://127.0.0.1`
- `http://0.0.0.0`
- `https://www.memact.com`

## Notes

- This repository now contains the browser app and browser extension only
- The legacy desktop app files have been removed

## License

See `LICENSE`.
