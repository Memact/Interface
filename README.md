# Memact Website

Version: `v0.0`

Website is the Memact user interface.

It owns one job:

```text
let a user ask about a thought and inspect the evidence Memact has for it
```

Website does not own capture, schema formation, memory storage, origin scoring, or influence scoring. It calls those layers through public contracts.

## What This Repo Owns

- Minimal search-style UI.
- Prompt mode for typing a thought directly.
- Survey mode for guided questions when the thought is vague or evidence is thin.
- History, settings, info panel, and local setup flow.
- Capture extension bridge integration.
- Local answer rendering with sources when available.
- Optional Gemini proxy for short answer wording from a small evidence packet.
- Render-ready web deployment.

## Product Modes

- `Prompt`
  User types a thought.

- `Survey`
  User answers a short flow. Website turns answers into a clearer query and can add useful local context.

Prompt and Survey have separate history entries.

## Capture Integration

Website talks to the Capture extension through `window.capture`.

It uses:

```js
window.capture.getSnapshot()
window.capture.getGraphPackets()
window.capture.getContentUnits()
window.capture.getMediaJobs()
```

The site should not read Capture internals or expect downloaded JSON files.

## Optional Gemini

Gemini is optional. The app should still function without it.

If enabled, Website sends only a compact evidence packet, not the full captured activity store.

Create a local `.env` file:

```text
GEMINI_API_KEY=replace_with_your_key
```

Do not commit real API keys.

## Run Locally

Prerequisites:

- Node.js `20+`
- npm `10+`

Install:

```powershell
npm install
```

Run dev server:

```powershell
npm run dev
```

Open:

```text
http://localhost:5173/
```

Build:

```powershell
npm run build
```

Preview production build:

```powershell
npm run preview
```

Run Gemini proxy locally:

```powershell
npm run api
```

## Deploy

This repo is suitable for Render as a web service/static frontend depending on the chosen deployment path.

Keep these out of Git:

- `.env`
- real API keys
- local capture exports
- temporary screenshots or pitch output

## License

See `LICENSE`.
