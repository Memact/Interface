# Memact Website

Version: `v0.0`

Website is the Memact web UI.

Memact lets apps request scoped memory permissions while users choose
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
- Data Transparency controls for reviewing and revoking app access
- account management
- plain-English help
- public pages that explain Memact for search and sharing

Website does not capture activity and does not read memory graphs. It talks to
the Supabase-backed access layer that protects app permissions.

The old demo/query website has been archived outside this repo at:

```text
../oldwebsite
```

## Product Definition

Memact lets apps remember useful context from your activity, but only inside
the permissions a user approves.

Website is not the memory engine. It is the account, app, permission, and API
key console.

```text
Website -> access layer -> scoped API key -> local activity capture -> filtering -> memory objects
```

Apps use Memact to work with approved activity and useful memory objects. They
do not get a blanket dump of a user's private graph. Each app can be limited to
activity categories such as research pages, news, media, AI conversations,
developer work, or documents.

## Current UI

The current UI is a minimal dark console built around `#00011B`, IBM Plex Sans,
compact cards, rounded controls, and consistent button hierarchy.

Authenticated dashboard:

- mobile uses a compact top row with the logo and tabs kept close
- desktop uses a fixed left rail with Access, Data, Account, and Help
- Access shows app registration, permissions, API keys, usage statistics, and the one-time key flow
- Data shows what each app can collect, active keys, consent state, and revocation controls
- Account shows identity, email/password actions, and account metrics
- Help uses short FAQs for users, developers, and AI coding agents

Button hierarchy:

```text
Primary: Create API key / Continue / Approve connection
Secondary: Save permissions / New app / Test key / Cancel
Danger: Delete app / Revoke / Sign out
Utility: Copy key / copy tutorial code
```

The UI should stay direct and calm. Avoid generic SaaS filler, fake AI claims,
and decorative copy that does not help someone complete the task.

## Public Pages and Discovery

The site includes crawlable public discovery assets:

- `/` for Memact metadata and app shell
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
# VITE_AUTH_REDIRECT_URL=http://localhost:3000/Access
```

Only use the Supabase anon key in Website. Never put a service role key, GitHub
OAuth client secret, or private database secret in frontend code.

Before the portal works, apply the access-layer SQL migration from:

```text
../Access/supabase/migrations/20260507120000_memact_access.sql
```

In Supabase Auth URL settings, allow the local and production callback URLs:

```text
http://localhost:3000/Access
http://localhost:3000/DataTransparency
http://localhost:3000/Account
http://localhost:3000/connect
https://www.memact.com/Access
https://www.memact.com/DataTransparency
https://www.memact.com/Account
https://www.memact.com/connect
https://www.memact.com/**
```

In Supabase GitHub provider settings, connect the GitHub OAuth App there. The
GitHub OAuth client secret belongs in Supabase, not this repo.

For Render, set:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
# Optional: VITE_AUTH_REDIRECT_URL=https://www.memact.com/Access
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
- Data Transparency must stay available alongside the consent flow so users can review and revoke access later.
- Revoked keys remain visible as history.
- Scopes and saved permissions are required before apps can use Memact.
- Activity categories are required before apps can use Memact.
- Connect App creates user-specific consent, like an app authorization page.
- Graph read access is separate from activity capture and schema writes.
- Redirect URLs and developer URLs must use `http://` or `https://`; unsafe schemes are rejected or ignored.
- Supabase is the primary access backend. The old HTTP service is only a fallback for local development.

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

Memact verifies the API key before an app can use approved capture, schema,
graph, or memory permissions. The app receives only the scopes and activity
categories the user approved for that app.

For AI coding agents and developer docs, keep the integration explanation
practical:

```text
1. Put a "Connect Memact" button in the app.
2. Send users to /connect with app_id, scopes, categories, redirect_uri, and optional state.
3. Store the returned connection_id for that user.
4. Keep the raw Memact API key on the server.
5. Verify api_key + connection_id + required_scopes before calling Memact.
6. Use only the approved scopes and categories returned by verification.
```

Do not describe repository names as separate brands. Memact is the brand; access,
capture, schema, and memory are functions or layers.

## Consent and Data Transparency

The consent page must show what the app is asking to do, what activity
categories it wants, and where users can review the decision later.

Data Transparency is the companion page for consent. It lets signed-in users:

- see each registered app's approved scopes and activity categories
- see active and revoked API keys for the selected app
- revoke an individual API key
- delete an app, which revokes its active API keys and saved consent
- understand whether the access layer has reported public key exposure signals

The frontend supports optional usage/exposure fields when the backend returns
them, such as `using_apps_count`, `client_count`, `exposure_status`, or
`public_exposure_detected`. Until those fields exist, the UI stays honest and
labels exposure as "No signal yet" instead of pretending to scan the public web.

## Help Tab

Website includes a Help tab for non-technical users. It explains:

- what Memact is
- whether apps get the whole memory graph
- what Connect App does
- what activity categories are
- how AI coding agents and developers should embed the API safely
- what schema packets are
- what apps should not do

The Help tab should stay short. Long docs belong in `/learn/` or future docs,
not inside the dashboard.

## Known Backend Hold Items

Frontend polish is mostly current. Backend issues are intentionally parked for
now.

The main future backend task is alignment between Website and the Supabase
access RPC layer, especially functions such as:

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
