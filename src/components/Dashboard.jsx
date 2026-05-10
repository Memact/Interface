import React from "react"
import { ACCESS_MODE, ACCESS_URL } from "../memact-access-client.js"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase-client.js"
import { CategoryGrid } from "./CategoryGrid.jsx"
import { HelpPanel } from "./HelpPanel.jsx"

export function Dashboard({
  activeTab,
  user,
  authUser,
  apps,
  apiKeys,
  consents,
  scopes,
  categories,
  selectedAppId,
  selectedScopes,
  selectedCategories,
  newAppName,
  newAppDescription,
  newAppDeveloperUrl,
  newAppRedirectUrl,
  newAppCategories,
  oneTimeKey,
  oneTimeKeyScopes,
  oneTimeKeyCategories,
  apiTestResult,
  showAppForm,
  setSelectedAppId,
  setSelectedScopes,
  setNewAppName,
  setNewAppDescription,
  setNewAppDeveloperUrl,
  setNewAppRedirectUrl,
  setNewAppCategories,
  setShowAppForm,
  onCreateApp,
  onDeleteApp,
  onGrantConsent,
  onCreateKey,
  onRevokeKey,
  onCopyKey,
  onTestKey,
  onSignOut,
  authLoading,
  needsPasswordSetup,
  setupPassword,
  setupPasswordConfirm,
  passwordState,
  passwordSuccess,
  setSetupPassword,
  setSetupPasswordConfirm,
  onSetPassword,
  newEmailAddress,
  setNewEmailAddress,
  emailChangeSuccess,
  authFlow,
  onChangeEmail
}) {
  const hasApps = apps.length > 0
  const isCreatingApp = showAppForm || !hasApps
  const selectedApp = hasApps ? apps.find((app) => app.id === selectedAppId) : null
  const selectedAppCategories = selectedApp?.default_categories || selectedCategories
  const selectedKeys = apiKeys.filter((key) => key.app_id === selectedAppId)
  const selectedConsent = consents.find((consent) => consent.app_id === selectedAppId && !consent.revoked_at)
  const scopesChanged = selectedConsent ? !sameValues(selectedScopes, selectedConsent.scopes) : true
  const categoriesChanged = selectedConsent ? !sameValues(selectedAppCategories, selectedConsent.categories || []) : true
  const consentChanged = scopesChanged || categoriesChanged
  const canCreateKey = Boolean(selectedAppId && selectedConsent && !consentChanged && selectedScopes.length && selectedAppCategories.length)
  const permissionsHint = !selectedAppId
    ? "Create app first."
    : selectedConsent
      ? consentChanged
        ? "Save permissions first."
        : ""
      : "Save permissions first."
  const createKeyHint = !selectedAppId
    ? "Create app first."
    : !selectedConsent
      ? "Save permissions first."
      : consentChanged
        ? "Save permissions first."
        : ""
  const appHeading = isCreatingApp
    ? hasApps ? "Create a new app." : "Create your first app."
    : selectedApp?.name || "Select an app."
  const appDescription = !isCreatingApp && selectedApp
    ? selectedApp.description || "No description added."
    : "Each app gets its own permissions and API keys."
  const dashboardLabel = activeTab === "account" ? "Account" : activeTab === "help" ? "Help" : "Access / API Keys"
  const dashboardSubtitle = activeTab === "account"
    ? "Manage your account and session."
    : activeTab === "help"
      ? "Plain-English help for Memact Access."
      : "Create app-specific keys with clear permission scopes."

  const provider = user?.provider || authUser?.app_metadata?.provider || authUser?.identities?.[0]?.provider || "email"
  const avatar = user?.avatar_url || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || ""
  const displayEmail = user?.email || authUser?.email || ""

  return (
    <section className="dashboard">
      <div className="dashboard-head panel slim-panel">
        <div>
          <p className="eyebrow">{dashboardLabel}</p>
          <h2>{displayEmail}</h2>
          <p className="muted">{dashboardSubtitle}</p>
        </div>
        <button type="button" className="ghost subtle-danger sign-out-button" onClick={onSignOut}>Sign out</button>
      </div>

      {activeTab === "help" ? (
        <HelpPanel />
      ) : activeTab === "account" ? (
        <section className="panel account-panel">
          <p className="eyebrow">Account</p>
          <div className="identity-card">
            {avatar ? <img src={avatar} alt="" /> : <span aria-hidden="true">{displayEmail.slice(0, 1).toUpperCase()}</span>}
            <div>
              <h2>{displayEmail}</h2>
              <p className="muted">Signed in with {provider}.</p>
            </div>
          </div>
          <div className="account-grid">
            <div className="metric-card">
              <span>Registered apps</span>
              <strong>{apps.length}</strong>
            </div>
            <div className="metric-card">
              <span>Active API keys</span>
              <strong>{apiKeys.filter((key) => !key.revoked_at).length}</strong>
            </div>
          </div>
          <p className="muted">
            Permissions mean you choose exactly which actions a registered app can ask Memact to perform. If a scope is not saved for that app, its API key cannot use that permission.
          </p>
          {provider === "email" ? (
            <section className="password-panel">
              <div>
                <p className="eyebrow">Password</p>
                <h2>{authFlow === "recovery" ? "Reset your password." : needsPasswordSetup ? "Set a password." : "Update your password."}</h2>
                <p className="muted">
                  {authFlow === "recovery"
                    ? "Your recovery link worked. Choose a new password to finish getting back into Memact."
                    : needsPasswordSetup
                    ? "You are signed in through the email link. Set a strong password now so the next login is faster."
                    : "Keep a strong password on this account so you can sign in without requesting a new link."}
                </p>
              </div>
              {passwordSuccess ? <p className="notice notice-success" role="status">{passwordSuccess}</p> : null}
              <form className="form" onSubmit={onSetPassword}>
                <label>
                  New password
                  <input
                    value={setupPassword}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    onChange={(event) => setSetupPassword(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    value={setupPasswordConfirm}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat the password"
                    onChange={(event) => setSetupPasswordConfirm(event.target.value)}
                    required
                  />
                </label>
                <div className="password-strength" data-strength={passwordState.level}>
                  <div className="password-strength-bar">
                    <span style={{ width: `${passwordState.percent}%` }} />
                  </div>
                  <strong>{passwordState.label}</strong>
                </div>
                <ul className="password-rules" aria-label="Password requirements">
                  {passwordState.checks.map((check) => (
                    <li key={check.label} className={check.ok ? "is-passed" : ""}>{check.label}</li>
                  ))}
                </ul>
                <button type="submit" disabled={!passwordState.canSubmit || authLoading === "set-password"}>
                  {authLoading === "set-password" ? "Saving password..." : authFlow === "recovery" ? "Reset password" : needsPasswordSetup ? "Save password" : "Update password"}
                </button>
              </form>
            </section>
          ) : null}
          {provider === "email" ? (
            <section className="password-panel">
              <div>
                <p className="eyebrow">Email</p>
                <h2>Change your email.</h2>
                <p className="muted">
                  Start an email change here. Supabase will send verification based on your project email settings.
                </p>
              </div>
              {emailChangeSuccess ? <p className="notice notice-success" role="status">{emailChangeSuccess}</p> : null}
              <form className="form" onSubmit={onChangeEmail}>
                <label>
                  New email address
                  <input
                    value={newEmailAddress}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Enter the new email address"
                    onChange={(event) => setNewEmailAddress(event.target.value)}
                    required
                  />
                </label>
                <button type="submit" disabled={authLoading === "change-email"}>
                  {authLoading === "change-email" ? "Sending confirmation..." : "Change email"}
                </button>
              </form>
            </section>
          ) : null}
        </section>
      ) : (
        <>
          <section id="app-panel" className="panel app-workspace">
            <div className="section-head">
              <div>
                <p className="eyebrow">App</p>
                <h2>{appHeading}</h2>
                <p className="muted">{appDescription}</p>
              </div>
              {hasApps ? (
                <div className="section-toolbar">
                  {!isCreatingApp && selectedApp ? (
                    <button type="button" className="ghost danger" onClick={onDeleteApp}>Delete app</button>
                  ) : null}
                  <button type="button" className="new-app-button" aria-label={isCreatingApp ? "Cancel app creation" : "Create app"} onClick={() => setShowAppForm((current) => !current)}>
                    {isCreatingApp ? "Cancel" : "New app"}
                  </button>
                </div>
              ) : null}
            </div>

            {isCreatingApp ? (
              <form className="form app-create-form" onSubmit={onCreateApp}>
                <label>
                  App name
                  <input value={newAppName} placeholder="Example: Personal capture layer" onChange={(event) => setNewAppName(event.target.value)} required />
                </label>
                <label>
                  Developer website
                  <input value={newAppDeveloperUrl} type="url" placeholder="Optional: https://example.com" onChange={(event) => setNewAppDeveloperUrl(event.target.value)} />
                </label>
                <label>
                  Connect redirect URL
                  <input value={newAppRedirectUrl} type="url" placeholder="Optional: where users return after connecting" onChange={(event) => setNewAppRedirectUrl(event.target.value)} />
                </label>
                <label>
                  Purpose
                  <textarea value={newAppDescription} placeholder="Optional: What will this app use Memact for?" onChange={(event) => setNewAppDescription(event.target.value)} />
                </label>
                <div>
                  <p className="eyebrow">Activity categories</p>
                  <p className="muted">Pick the kinds of activity this app is allowed to work with. This keeps apps narrow by design.</p>
                  <CategoryGrid
                    categories={categories}
                    selected={newAppCategories}
                    onToggle={(category) => toggleValue(setNewAppCategories, category)}
                  />
                </div>
                <button type="submit">Create app</button>
              </form>
            ) : null}

            {hasApps ? (
              <div className="app-switcher" aria-label="Select app">
                {apps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    className={`app-chip ${selectedAppId === app.id ? "is-active" : ""}`}
                    onClick={() => setSelectedAppId(app.id)}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <div className="access-layout">
            <section id="permissions-panel" className="panel">
              <div className="section-head">
                <div className="section-copy">
                  <p className="eyebrow">Permissions</p>
                  <h2>Choose what this app can ask Memact to do.</h2>
                  <p className="muted">
                    {selectedConsent
                      ? consentChanged ? "Permissions changed. Save them before creating the next key." : "Permissions are saved for this app. Change scopes any time."
                      : "Save permissions before creating a usable API key."}
                  </p>
                </div>
                <div className="actions section-actions">
                  <span className="tooltip-wrap" title={permissionsHint || undefined}>
                    <button type="button" className="ghost" disabled={!selectedAppId || !selectedScopes.length || !selectedAppCategories.length} onClick={onGrantConsent}>Save permissions</button>
                  </span>
                  <span className="tooltip-wrap" title={createKeyHint || undefined}>
                    <button type="button" disabled={!canCreateKey} onClick={onCreateKey}>Create API key</button>
                  </span>
                </div>
              </div>
              <div className="scope-grid">
                {Object.entries(scopes).map(([scope, definition]) => {
                  const inputId = `scope-${scope.replace(/[^a-z0-9_-]/gi, "-")}`
                  return (
                    <label key={scope} className="scope-card" htmlFor={inputId}>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={selectedScopes.includes(scope)}
                        onChange={() => {
                          setSelectedScopes((current) => current.includes(scope)
                            ? current.filter((item) => item !== scope)
                            : [...current, scope])
                        }}
                      />
                      <span>
                        <strong>{scope}</strong>
                        <small>{definition.description}</small>
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>

            <section id="api-keys-panel" className="panel">
              <p className="eyebrow">API keys</p>
              <div className="stack">
                {selectedKeys.length ? selectedKeys.map((key) => (
                  <div className="list-card api-key-row" key={key.id}>
                    <span>
                      <strong>{key.name}</strong>
                      <small>{key.key_prefix}...</small>
                    </span>
                    <span className={key.revoked_at ? "badge badge-danger" : "badge badge-success"}>{key.revoked_at ? "revoked" : "active"}</span>
                    {!key.revoked_at ? <button type="button" className="ghost" onClick={() => onRevokeKey(key.id)}>Revoke</button> : null}
                  </div>
                )) : <p className="muted">{selectedAppId ? "No API keys for this app yet." : "Select an app to view API keys."}</p>}
              </div>
            </section>
          </div>
        </>
      )}

      {oneTimeKey ? (
        <section id="one-time-key-panel" className="panel key-panel">
          <div>
            <p className="eyebrow">Copy now</p>
            <h2>One-time API key</h2>
          </div>
          <div className="key-box">
            <code>{oneTimeKey}</code>
            <div className="key-actions">
              <button type="button" onClick={onCopyKey}>Copy key</button>
              <button type="button" className="ghost" onClick={onTestKey}>Test key</button>
            </div>
          </div>
          {apiTestResult ? <p className="notice notice-success" role="status">{apiTestResult}</p> : null}
          <details className="embed-code">
            <summary>Embed code</summary>
            <pre><code>{buildEmbedCode(oneTimeKey, oneTimeKeyScopes, oneTimeKeyCategories, selectedApp)}</code></pre>
          </details>
          <p className="muted">Memact stores only a hash. This raw key cannot be shown again.</p>
        </section>
      ) : null}
    </section>
  )
}

function sameValues(first = [], second = []) {
  const firstList = [...first].sort()
  const secondList = [...second].sort()
  return firstList.length === secondList.length && firstList.every((value, index) => value === secondList[index])
}

function toggleValue(setter, value) {
  setter((current) => current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value])
}

function buildEmbedCode(apiKey, scopes = [], categories = [], app = null) {
  const appId = app?.id || "app_id_from_memact_portal"
  const redirectUrl = app?.redirect_urls?.[0] || app?.developer_url || "https://your-app.example.com/memact/callback"
  const connectUrl = buildPortalConnectUrl(appId, scopes, [], redirectUrl)
  if (ACCESS_MODE === "supabase") {
    const accessUrl = SUPABASE_URL || "https://memact.supabase.co"
    const publicKey = SUPABASE_ANON_KEY || "MEMACT_PUBLIC_ACCESS_KEY"
    return `// 1. Put this URL behind your own "Connect Memact" button.
const memactConnectUrl = "${connectUrl}";

// 2. After the user approves, Memact redirects back with ?connected=1&connection_id=...
const memactConnectionId = "connection_id_from_connect_redirect";

// 3. Verify the API key, user connection, and scopes before doing work.
const MEMACT_ACCESS_URL = "${accessUrl}";
const MEMACT_PUBLIC_ACCESS_KEY = "${publicKey}";
const memactApiKey = "${apiKey || "mka_key_shown_once"}";
const requiredScopes = ${JSON.stringify(scopes, null, 2)};

const response = await fetch(\`\${MEMACT_ACCESS_URL}/rest/v1/rpc/memact_verify_api_key\`, {
  method: "POST",
  headers: {
    "apikey": MEMACT_PUBLIC_ACCESS_KEY,
    "Authorization": \`Bearer \${MEMACT_PUBLIC_ACCESS_KEY}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    api_key_input: memactApiKey,
    required_scopes_input: requiredScopes,
    consent_id_input: memactConnectionId
  })
});

const access = await response.json();
if (!access?.allowed) {
  throw new Error(access?.error?.message || "Memact access denied.");
}

console.log("Memact access granted", {
  app: access.app?.name,
  scopes: access.scopes,
  categories: access.categories
});

// 4. Topic-wise integration examples.
// Capture: use access.categories to keep captured activity inside this app's categories.
// Schema: write schema packets with evidence, nodes, and edges, not raw private dumps.
// Memory: request summaries/evidence/graph objects only if the approved scopes include them.`
  }

  return `import { createMemactCaptureClient } from "./memact-capture-client.mjs";

const memact = createMemactCaptureClient({
  accessUrl: "${ACCESS_URL}",
  apiKey: "${apiKey || "mka_key_shown_once"}"
});

const { snapshot } = await memact.getLocalSnapshot({
  scopes: ${JSON.stringify(scopes, null, 2)},
  connectionId: "connection_id_from_connect_redirect"
});

console.log(snapshot.counts);`
}

function buildPortalConnectUrl(appId, scopes = [], categories = [], redirectUrl = "") {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://memact.com"
  const url = new URL("/connect", origin)
  url.searchParams.set("app_id", appId)
  if (scopes.length) url.searchParams.set("scopes", scopes.join(","))
  if (categories.length) url.searchParams.set("categories", categories.join(","))
  if (redirectUrl) url.searchParams.set("redirect_uri", redirectUrl)
  return url.toString()
}
