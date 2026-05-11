import React from "react"
import "../provider-platform.css"

const PLATFORM_STATS = [
  ["Requests today", "—", "Usage tracking pending backend events."],
  ["Allowed / denied", "—", "Show success and failure split once logs are wired."],
  ["Last request", "—", "Useful for checking whether an integration is alive."],
  ["Most used scope", "—", "Highlights the memory permission apps use most."]
]

const REQUEST_LOGS = [
  ["verify_api_key", "allowed", "Key, connection, and scopes matched."],
  ["memory:read_summary", "denied", "Example reason: missing_scope."],
  ["connect", "cancelled", "User cancelled before approval."]
]

const AUDIT_EVENTS = [
  "API key created",
  "Permissions saved",
  "App connected",
  "API key revoked",
  "Display name updated"
]

const ERROR_REASONS = [
  "missing_scope",
  "revoked_key",
  "invalid_key",
  "connection_revoked",
  "category_not_allowed",
  "rate_limited"
]

const DOCS = [
  "Create an app",
  "Save permissions",
  "Create an API key",
  "Send users through Connect",
  "Verify key + connection",
  "Handle denied access"
]

export function ProviderPlatform() {
  return (
    <section className="platform-panel" aria-label="Developer platform surfaces">
      <div className="platform-head">
        <p className="eyebrow">Developer platform</p>
        <h2>Provider features Memact should expose.</h2>
        <p className="muted">These surfaces keep the product API-provider shaped without bloating the main Access flow.</p>
      </div>

      <div className="platform-grid metrics-grid">
        {PLATFORM_STATS.map(([label, value, note]) => (
          <article className="platform-card metric-tile" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>

      <div className="platform-grid two-col">
        <article className="platform-card">
          <p className="eyebrow">Usage</p>
          <h3>Usage statistics</h3>
          <p className="muted">Track requests by app, key, scope, result, and time range.</p>
          <div className="mini-list">
            <span>Requests today</span>
            <span>Requests this month</span>
            <span>Per-app and per-key usage</span>
            <span>Allowed vs denied</span>
          </div>
        </article>

        <article className="platform-card">
          <p className="eyebrow">Logs</p>
          <h3>Request logs</h3>
          <div className="log-list">
            {REQUEST_LOGS.map(([action, status, reason]) => (
              <div className="log-row" key={`${action}-${status}`}>
                <span>{action}</span>
                <strong className={status === "allowed" ? "ok" : status === "denied" ? "bad" : "muted-status"}>{status}</strong>
                <small>{reason}</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="platform-grid two-col">
        <article className="platform-card">
          <p className="eyebrow">Connections</p>
          <h3>Connection management</h3>
          <p className="muted">Show which apps are connected, what scopes they hold, and allow users to revoke access.</p>
          <div className="connection-preview">
            <strong>Example app</strong>
            <small>capture:webpage · memory:read_summary</small>
            <span className="badge badge-success">active</span>
          </div>
        </article>

        <article className="platform-card">
          <p className="eyebrow">Audit</p>
          <h3>Audit log</h3>
          <ul className="audit-list">
            {AUDIT_EVENTS.map((event) => <li key={event}>{event}</li>)}
          </ul>
        </article>
      </div>

      <div className="platform-grid two-col">
        <article className="platform-card">
          <p className="eyebrow">Webhooks</p>
          <h3>Webhook events</h3>
          <p className="muted">Expose event delivery for apps that need to react to permission or connection changes.</p>
          <div className="mini-list compact-tags">
            <span>app.connected</span>
            <span>permission.updated</span>
            <span>api_key.revoked</span>
            <span>memory.denied</span>
          </div>
        </article>

        <article className="platform-card">
          <p className="eyebrow">Errors</p>
          <h3>Error reasons</h3>
          <p className="muted">Denied requests should explain exactly what failed.</p>
          <div className="mini-list compact-tags">
            {ERROR_REASONS.map((reason) => <span key={reason}>{reason}</span>)}
          </div>
        </article>
      </div>

      <div className="platform-grid two-col">
        <article className="platform-card">
          <p className="eyebrow">Environments</p>
          <h3>Development / Production</h3>
          <p className="muted">Separate test integrations from real memory access.</p>
          <div className="environment-row">
            <span>Development</span>
            <span>Production</span>
          </div>
        </article>

        <article className="platform-card">
          <p className="eyebrow">Security</p>
          <h3>Key controls</h3>
          <p className="muted">Add key naming, created date, rotation, revoke confirmation, and one-time secret warnings.</p>
          <div className="mini-list">
            <span>Named keys</span>
            <span>Created / last used</span>
            <span>Rotate key</span>
            <span>Revoke confirmation</span>
          </div>
        </article>
      </div>

      <article className="platform-card docs-card">
        <p className="eyebrow">Docs</p>
        <h3>Quickstart</h3>
        <div className="docs-steps">
          {DOCS.map((step, index) => (
            <span key={step}><strong>{index + 1}</strong>{step}</span>
          ))}
        </div>
        <pre><code>{`curl -X POST "$MEMACT_ACCESS_URL/rest/v1/rpc/memact_verify_api_key" \
  -H "apikey: $MEMACT_PUBLIC_ACCESS_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api_key_input":"mka_...","required_scopes_input":["memory:read_summary"]}'`}</code></pre>
      </article>
    </section>
  )
}
