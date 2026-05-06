# Memact Website

Version: `v0.0`

Website is now the Memact Access portal.

It owns one job:

```text
let a developer or user sign in, register an app, grant consent, and create API keys
```

Website does not capture activity and does not read memory graphs. It talks to
Access, which protects the permission boundary.

The old demo/query website has been archived outside this repo at:

```text
../oldwebsite
```

## Flow

```text
Website -> Access -> scoped API key -> Capture / Inference / Schema / Memory
```

Apps use Memact to capture allowed activity and form schemas. Apps do not get a
blanket dump of a user's private graph.

## Run Locally

Start Access first:

```powershell
cd ../Access
npm install
npm run dev
```

Start Website:

```powershell
cd ../interface
npm install
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

## Configuration

Create `.env` if Access is not running on the default URL:

```text
VITE_MEMACT_ACCESS_URL=http://127.0.0.1:8787
```

Do not commit real secrets.

For Render, set:

```text
VITE_MEMACT_ACCESS_URL=https://memact-access.onrender.com
```

Change the URL if the Access service uses a custom domain.

## Render and SEO

`render.yaml` deploys Website as a Render static site and points it at the
Access service URL above. The site includes:

- canonical URL for `https://www.memact.com/`
- `robots.txt`
- `sitemap.xml`
- Open Graph and Twitter preview tags
- JSON-LD for the web app
- mobile viewport and PWA manifest basics

## Current Policy

- Free unlimited access for now.
- API keys are shown once.
- Scope and consent are required before apps can use Memact.
- Graph read access is separate from capture/schema write access.

## License

See `LICENSE`.
