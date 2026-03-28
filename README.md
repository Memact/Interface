# Memact v1.1

Memact is a local-first browser memory system. The website lives at `https://www.memact.com`, and the optional desktop extension captures browsing activity locally so you can search it from the site.

Memact is still experimental. It is meant to be fast, private, and useful before it is polished.

## What Memact Does

- Captures local browser activity through the desktop extension
- Lets the website search those saved memories locally
- Supports phone browsers in local web mode
- Tries to skip junk, shell pages, and low-value captures
- Renders full saved memories with structured facts instead of only snippets
- Supports math-heavy memories better with KaTeX-based rendering
- Builds an Episodic Graph so related activity can support and explain results

## Core Ideas

### Local-first

- Captures stay on-device
- Search runs against local saved memories
- No cloud AI calls are required for the main engine

### Deterministic Retrieval

Memact does not treat memory as one raw blob. It builds structured records from captures and ranks them using:

- exact field matches
- metadata filters
- local embeddings
- reranking
- session support
- episodic graph support

### Episodic Graph

Memact v1.1 introduces an Episodic Graph.

Each event can connect to other events with:

- a relationship type
- a relationship score
- a short reason

Examples:

- search result -> opened page
- docs page -> terminal action
- reading -> coding
- same topic
- same entity
- same session continuation

This helps Memact answer:

- what led to this?
- what happened after this?
- what else was connected to this?

## How The System Works

1. The extension captures a page locally.
2. Memact extracts title, URL, snippet, full text, keyphrases, and metadata.
3. Capture intent decides whether the page should be stored fully, stored structurally, kept as metadata only, or skipped.
4. Clutter audit checks whether the capture is messy or low-value.
5. Context extraction builds a structured profile:
   - page type
   - subject
   - entities
   - topics
   - facts
   - summary
6. Local embeddings and reranking help search find relevant memories.
7. Session logic groups nearby related events.
8. The Episodic Graph links strongly related events.
9. The website shows direct results plus connected activity and full saved text.

## Current Product Shape

### Website

- React + Vite site
- hosted at `https://www.memact.com`
- desktop and phone-friendly UI
- local search interface
- manual extension setup flow inside the site

### Desktop Extension

- Chromium-based browser extension
- local capture engine
- local IndexedDB storage
- background snapshotting of active browsing context
- icon opens `https://www.memact.com`

### Phone Mode

- works in local web mode
- does not do desktop-style automatic browser capture
- useful as a lightweight Memact shell until a stronger mobile capture path exists

## Tech Stack

- React
- Vite
- Chrome/Edge Manifest V3 extension
- IndexedDB
- `@xenova/transformers`
- KaTeX
- local reranking and context modules

## Important Local Modules

- `extension/memact/background.js`
  - capture orchestration, messaging, and storage flow
- `extension/memact/context-pipeline.js`
  - page understanding, summaries, facts, and cleaned display text
- `extension/memact/capture-intent.js`
  - decides what kind of page this is and what to keep
- `extension/memact/clutter-audit.js`
  - scores messy captures and trims or skips them
- `extension/memact/page-intelligence.js`
  - local page usefulness judgement
- `extension/memact/query-engine.js`
  - retrieval, reranking, sessions, and episodic graph logic
- `src/lib/localLanguageModel.js`
  - optional local wording polish on supported desktop browsers

## Privacy

- local by default
- no cloud memory sync in the current product
- no remote AI dependency for retrieval
- no screenshots
- no keystroke logging

Memact may download local model files to the device for optional local language polish when supported by the browser.

## Running Locally

Install dependencies:

```powershell
npm install
```

Start dev server:

```powershell
npm run dev
```

Build production site:

```powershell
npm run build
```

Package the extension zip:

```powershell
npm run package-extension
```

## Loading The Extension Manually

Use the website menu item `Install Browser Extension`.

That setup flow now explains the unpacked install steps inside Memact itself.

Manual install flow:

1. Open `chrome://extensions`, `edge://extensions`, `brave://extensions`, `opera://extensions`, or `vivaldi://extensions`
2. Turn on Developer mode
3. Click `Load unpacked`
4. Select the extracted folder that directly contains `manifest.json`
5. Reload the Memact website

## Supported Hosts

The extension bridge currently supports:

- `http://localhost`
- `http://127.0.0.1`
- `http://0.0.0.0`
- `https://memact.com`
- `https://www.memact.com`

## Repo Layout

- `src/` - website UI
- `extension/memact/` - browser extension
- `public/` - static website assets
- `assets/` - fonts and visual assets
- `memact_branding/` - logos and brand files
- `scripts/` - packaging and setup helpers

## Status

This is `v1.1`.

It is launchable and usable, but still experimental. Retrieval quality, capture cleanliness, and page-type handling are improving continuously.

## License

See `LICENSE`.
