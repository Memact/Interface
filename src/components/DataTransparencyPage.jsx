import React from "react"

export function DataTransparencyPage({
  app,
  categories,
  scopes,
  requestedCategories = [],
  requestedScopes = [],
  transparency,
  onBackToConsent,
  onManageConsent
}) {
  const appName = app?.name || "this app"
  const dataUses = normalizeDisclosureList(transparency?.data_uses || transparency?.dataUses)
  const capturedData = normalizeDisclosureList(transparency?.captured_data || transparency?.capturedData || transparency?.data_collected)
  const graphPackets = normalizeDisclosureList(transparency?.graph_packets || transparency?.graphPackets || transparency?.memory_packets)
  const retention = transparency?.retention || transparency?.retention_policy || "The app has not provided a specific retention statement yet."
  const revocation = transparency?.revocation || transparency?.revocation_policy || "After consent is revoked, new Memact access should stop. Previously copied data must follow the app's own deletion policy."
  const safeRequestedScopes = Array.isArray(requestedScopes) ? requestedScopes : []
  const safeRequestedCategories = Array.isArray(requestedCategories) ? requestedCategories : []

  return (
    <section className="panel transparency-panel">
      <div className="transparency-hero">
        <div>
          <p className="eyebrow">Data transparency</p>
          <h2>What {appName} will use Memact for.</h2>
          <p className="muted">
            This page belongs beside consent. Before approving, you should be able to see the actual data, evidence, and graph packets an app expects to use, not just broad categories.
          </p>
        </div>
        <div className="transparency-summary" aria-label="Transparency summary">
          <span>
            <strong>{safeRequestedScopes.length}</strong>
            Requested scopes
          </span>
          <span>
            <strong>{safeRequestedCategories.length}</strong>
            Activity categories
          </span>
        </div>
      </div>

      <div className="app-identity connect-identity">
        <span className="app-avatar" aria-hidden="true">{appName.slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>{appName}</strong>
          {app?.developer_url ? (
            <a className="muted" href={app.developer_url} target="_blank" rel="noreferrer">{app.developer_url}</a>
          ) : <span className="muted">Developer URL not provided.</span>}
        </div>
      </div>

      <div className="transparency-grid">
        <section className="permission-list transparency-card">
          <p className="eyebrow">Actual data used</p>
          <h3>Captured data and evidence</h3>
          <DisclosureList
            items={capturedData}
            empty="This app has not listed exact captured data yet. It should disclose the real fields it uses, such as URLs, page titles, selected text, transcripts, evidence snippets, or timestamps."
          />
        </section>

        <section className="permission-list transparency-card">
          <p className="eyebrow">Memory objects</p>
          <h3>Graph packets and summaries</h3>
          <DisclosureList
            items={graphPackets}
            empty="This app has not listed exact graph packets yet. If it writes or reads memory, it should describe the packet types, summaries, evidence cards, nodes, edges, or aggregates it uses."
          />
        </section>

        <section className="permission-list transparency-card">
          <p className="eyebrow">Purpose</p>
          <h3>What the app says it will do</h3>
          <DisclosureList
            items={dataUses}
            empty={app?.description || "This app has not provided a plain-language purpose for its Memact usage yet."}
          />
        </section>

        <section className="permission-list transparency-card">
          <p className="eyebrow">Boundaries</p>
          <h3>Scopes and categories</h3>
          <div className="transparency-token-list">
            {safeRequestedScopes.map((scope) => (
              <span className="data-token" key={scope}>{scopes?.[scope]?.label || scope}</span>
            ))}
            {safeRequestedCategories.map((category) => (
              <span className="data-token" key={category}>{categories?.[category]?.label || category}</span>
            ))}
            {!safeRequestedScopes.length && !safeRequestedCategories.length ? (
              <p className="muted">No scopes or activity categories were attached to this transparency link.</p>
            ) : null}
          </div>
        </section>

        <section className="permission-list transparency-card">
          <p className="eyebrow">Retention</p>
          <h3>How long it keeps data</h3>
          <p className="muted">{retention}</p>
        </section>

        <section className="permission-list transparency-card">
          <p className="eyebrow">Revoke</p>
          <h3>How to stop future access</h3>
          <p className="muted">{revocation}</p>
        </section>
      </div>

      <section className="permission-list consent-summary-card">
        <p className="eyebrow">Required app disclosure</p>
        <div className="mini-row">
          <strong>Categories are not enough.</strong>
          <small>Apps using Memact should disclose the actual captured fields, memory objects, graph packets, retention, and revocation path before asking users to approve.</small>
        </div>
      </section>

      <div className="connect-actions">
        <button type="button" onClick={onBackToConsent}>Back to consent</button>
        <button type="button" className="ghost" onClick={onManageConsent}>Open dashboard</button>
      </div>
    </section>
  )
}

function DisclosureList({ items, empty }) {
  if (!items.length) {
    return <p className="muted">{empty}</p>
  }
  return (
    <div className="stack">
      {items.map((item) => (
        <div className="mini-row" key={item.title}>
          <strong>{item.title}</strong>
          {item.description ? <small>{item.description}</small> : null}
        </div>
      ))}
    </div>
  )
}

function normalizeDisclosureList(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === "string") return { title: item.trim(), description: "" }
      return {
        title: String(item?.title || item?.name || item?.type || "").trim(),
        description: String(item?.description || item?.details || item?.purpose || "").trim()
      }
    })
    .filter((item) => item.title)
}
