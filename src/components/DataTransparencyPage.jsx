import React from "react"

export function DataTransparencyPage({
  apps,
  apiKeys,
  consents,
  categories,
  scopes,
  selectedAppId,
  setSelectedAppId,
  onDeleteApp,
  onRevokeKey
}) {
  const selectedApp = apps.find((app) => app.id === selectedAppId) || apps[0] || null
  const appConsents = selectedApp ? consents.filter((consent) => consent.app_id === selectedApp.id) : []
  const activeConsent = appConsents.find((consent) => !consent.revoked_at) || null
  const selectedKeys = selectedApp ? apiKeys.filter((key) => key.app_id === selectedApp.id) : []
  const activeKeys = selectedKeys.filter((key) => !key.revoked_at)
  const revokedKeys = selectedKeys.filter((key) => key.revoked_at)
  const approvedCategories = activeConsent?.categories || selectedApp?.default_categories || []
  const approvedScopes = activeConsent?.scopes || selectedApp?.default_scopes || []

  return (
    <section className="panel transparency-panel">
      <div className="transparency-hero">
        <div>
          <p className="eyebrow">Data transparency</p>
          <h2>See what each app can collect, and shut it off.</h2>
          <p className="muted">
            Consent is not a one-time trap. This page shows the apps, scopes, categories, and keys that can currently work with Memact on your behalf.
          </p>
        </div>
        <div className="transparency-summary" aria-label="Transparency summary">
          <span>
            <strong>{apps.length}</strong>
            Registered apps
          </span>
          <span>
            <strong>{activeKeys.length}</strong>
            Active keys here
          </span>
        </div>
      </div>

      {apps.length ? (
        <div className="registered-apps transparency-app-picker">
          <p className="app-list-label">Choose app</p>
          <div className="app-switcher" aria-label="Choose app for data transparency">
            {apps.map((app) => (
              <button
                key={app.id}
                type="button"
                className={`app-chip ${selectedApp?.id === app.id ? "is-active" : ""}`}
                onClick={() => setSelectedAppId(app.id)}
              >
                {app.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted">Create an app first. Once an app asks for consent, its data boundary appears here.</p>
      )}

      {selectedApp ? (
        <div className="transparency-grid">
          <section className="permission-list transparency-card">
            <p className="eyebrow">What can be collected</p>
            <h3>{selectedApp.name}</h3>
            <p className="muted">
              Memact can only work inside the approved activity categories below. Anything outside this set should stay out of this app's memory flow.
            </p>
            <div className="transparency-token-list">
              {approvedCategories.length ? approvedCategories.map((category) => (
                <span className="data-token" key={category}>{categories?.[category]?.label || category}</span>
              )) : <span className="muted">No activity categories saved.</span>}
            </div>
          </section>

          <section className="permission-list transparency-card">
            <p className="eyebrow">What the app can ask for</p>
            <h3>Approved API scopes</h3>
            <div className="transparency-token-list">
              {approvedScopes.length ? approvedScopes.map((scope) => (
                <span className="data-token" key={scope}>{scopes?.[scope]?.label || scope}</span>
              )) : <span className="muted">No permissions saved.</span>}
            </div>
          </section>

          <section className="permission-list transparency-card">
            <p className="eyebrow">Active controls</p>
            <h3>Stop collection later</h3>
            <p className="muted">
              Revoke individual keys to stop API access for a deployed client. Delete the app to revoke its active keys and saved consent together.
            </p>
            <div className="stack">
              {activeKeys.length ? activeKeys.map((key) => (
                <div className="list-card api-key-row" key={key.id}>
                  <span>
                    <strong>{key.name}</strong>
                    <small>{key.key_prefix}... {key.last_used_at ? `last used ${formatDate(key.last_used_at)}` : "not used yet"}</small>
                  </span>
                  <span className="badge badge-success">active</span>
                  <button type="button" className="ghost" onClick={() => onRevokeKey(key.id)}>Revoke</button>
                </div>
              )) : <p className="muted">No active API keys for this app.</p>}
              <button type="button" className="ghost danger" onClick={onDeleteApp}>Delete app and revoke consent</button>
            </div>
          </section>

          <section className="permission-list transparency-card">
            <p className="eyebrow">Audit trail</p>
            <h3>Consent and key history</h3>
            <div className="mini-row">
              <strong>{activeConsent ? "Consent is active" : "No active consent"}</strong>
              <small>{activeConsent?.updated_at || activeConsent?.created_at ? `Last updated ${formatDate(activeConsent.updated_at || activeConsent.created_at)}` : "Save permissions to create a consent record."}</small>
            </div>
            <div className="mini-row">
              <strong>{revokedKeys.length} revoked key{revokedKeys.length === 1 ? "" : "s"}</strong>
              <small>Revoked keys stay visible so you can audit old access without reusing secrets.</small>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function formatDate(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
