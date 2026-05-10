# Memact Website

Version: `v0.0`

Website is the Memact Access web UI.

Memact Access lets apps request scoped memory permissions while users choose
what each app can access.

```text
Apps ask for memory access. Users choose what they get.
```

Website owns the public and authenticated interface for:

- sign in with email, password, magic link, or GitHub
- app registration
- scoped permission selection
- activity category selection
- API key creation, testing, and revocation
- Connect App consent flow
- account management
- plain-English help
- public SEO/AI-search explanation pages

Website does not capture activity and does not read memory graphs. It talks to
the Access layer inside Supabase, which protects the permission boundary.

The old demo/query website has been archived outside this repo at:

```text
../oldwebsite
```

## Product Definition

Memact is infrastructure that lets apps create permissioned memory from your
digital activity.

Website is not the memory engine. It is the access console.

```text
Website -> Supabase Access layer -> scoped API key -> Capture / Inference / Schema / Memory
```

Apps use Memact to capture allowed activity and form schemas. Apps do not get a
blanket dump of a user's private graph. Each app can be restricted to activity
categories such as news, research pages, media context, AI conversations,
developer work, or documents.

## Current UI

The current UI is a minimal dark console built around `#00011B`, IBM Plex Sans,
compact cards, rounded controls, and consistent button hierarchy.

Authenticated dashboard:

- mobile uses a compact top row with logo left and tabs right
- desktop uses a fixed left rail with Access, Account, and Help tabs
- Access tab shows account/app context, registered app rail, permissions, API keys, and one-time key copy/test flow
- Account tab shows identity, session, email/password actions, and account metrics
- Help tab gives short expandable explanations instead of a long FAQ wall

Button hierarchy:

```text
Primary: Create API key / Continue / Approve connection
Secondary: Save permissions / New app / Test key / Cancel
Danger: Delete app / Revoke / Sign out
Utility: Copy key / copy tutorial code
```

The UI avoids generic SaaS clutter, random gradients, and fake AI marketing
language. It should feel like infrastructure with clarity, not a landing-page
billboard.

## Public Pages and Discovery

The site includes crawlable public discovery assets:

- `/` for Memact Access metadata and app shell
- `/learn/` for a static explanation page
- `/robots.txt`
- `/sitemap.xml`
- `/llms.txt`
- Open Graph and Twitter preview metadata
- JSON-LD for the web app and FAQ content
- PWA manifest basics

`/learn/` explains Memact in standalone sections so Google, Perplexity, and
other search/answer systems can understand the product without needing to run
the authenticated React dashboard.

## Run Locally

Start Website:

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:3000/
```

Build:

```powershell
npm run build
```

## Configuration

Create `.env`:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
# Optional override for non-standard deploy domains. Defaults to the current origin.
# VITE_AUTH_REDIRECT_URL=http://localhost:3000/dashboard
```

Only use the Supabase anon key in Website. Never put a service role key, GitHub
OAuth client secret, or private database secret in frontend code.

Before the portal works, apply the Access SQL migration from:

```text
../Access/supabase/migrations/20260507120000_memact_access.sql
```

In Supabase Auth URL settings, allow the local and production callback URLs:

```text
http://localhost:3000/dashboard
http://localhost:3000/connect
https://www.memact.com/dashboard
https://www.memact.com/connect
https://www.memact.com/**
```

In Supabase GitHub provider settings, connect the GitHub OAuth App there. The
GitHub OAuth client secret belongs in Supabase, not this repo.

For Render, set:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
# Optional: VITE_AUTH_REDIRECT_URL=https://www.memact.com/dashboard
```

## Render and SEO

`render.yaml` deploys Website as a Render static site.

The current production canonical is:

```text
https://www.memact.com/
```

Google Search Console verification uses a static file under `public/`.

Sitemap submission path:

```text
sitemap.xml
```

Full sitemap URL:

```text
https://www.memact.com/sitemap.xml
```

If Blueprint setup fails, use the direct Dashboard path in
[`RENDER_DIRECT_DEPLOY.md`](./RENDER_DIRECT_DEPLOY.md).

## Current Policy

- Source-available project wording. Do not call core Memact repos open-source unless that repo license says so.
- Free access for now.
- API keys are shown once.
- App names are unique per account.
- Deleting an app revokes its active API keys and permissions.
- Revoked keys remain visible as history.
- Scopes and saved permissions are required before apps can use Memact.
- Activity categories are required before apps can use Memact.
- Connect App creates user-specific consent, like an app authorization page.
- Graph read access is separate from capture/schema write access.
- Supabase is the primary Access backend. The old HTTP Access service is only a fallback for local development.

## App Embed / Connect Tutorial

After creating an API key, Website shows:

- a one-time API key
- `Copy key`
- `Test key`
- a beginner-style Connect tutorial
- copy buttons for each tutorial code section

The tutorial is intentionally split into numbered steps instead of one giant
code dump:

```text
1. Send the user to Connect App
2. Read the connection id after approval
3. Verify access before doing work
4. Use only approved access
```

Normal app flow:

```text
developer creates app
-> chooses scopes and categories
-> user clicks "Connect Memact" inside the third-party app
-> Memact shows the app, permissions, and activity categories
-> user approves or cancels
-> approved apps receive a connection_id
-> app verifies API key + connection_id + scopes before doing work
```

API keys identify the app. `connection_id` identifies the specific user consent.
Verification must pass both.

The API key is verified by Memact before an app can use allowed capture, schema,
graph, or memory permissions. The app receives only the scopes the user approved
for that app, inside the activity categories the user approved.

## Help Tab

Website includes a Help tab for non-technical users. It explains:

- what Memact is
- whether apps get the whole memory graph
- what Connect App does
- what activity categories are
- what schema packets are
- what apps should not do

The Help tab should stay short. Long docs belong in `/learn/` or future docs,
not inside the dashboard.

## Known Backend Hold Items

Frontend polish is mostly current. Backend issues are intentionally parked for
now.

The main future backend task is alignment between Website and the Supabase
Access RPC layer, especially functions such as:

```text
memact_create_app
memact_grant_consent
memact_create_api_key
memact_verify_api_key
memact_revoke_api_key
```

Supabase RPC names and argument names must match exactly, otherwise the
schema-cache error returns.

## License

See `LICENSE`.
