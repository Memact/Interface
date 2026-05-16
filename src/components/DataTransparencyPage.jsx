import React from "react"

export function DataTransparencyPage({
  app,
  categories,
  scopes,
  requestedCategories = [],
  requestedScopes = [],
  transparency,
  onUpdateSelection,
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
  const toggleScope = (scope) => {
    if (safeRequestedScopes.length <= 1 && safeRequestedScopes.includes(scope)) return
    const nextScopes = safeRequestedScopes.includes(scope)
      ? safeRequestedScopes.filter((item) => item !== scope)
      : [...safeRequestedScopes, scope]
    onUpdateSelection?.({ scopes: nextScopes, categories: safeRequestedCategories })
  }
  const toggleCategory = (category) => {
    if (safeRequestedCategories.length <= 1 && safeRequestedCategories.includes(category)) return
    const nextCategories = safeRequestedCategories.includes(category)
      ? safeRequestedCategories.filter((item) => item !== category)
      : [...safeRequestedCategories, category]
    onUpdateSelection?.({ scopes: safeRequestedScopes, categories: nextCategories })
  }

  return (
    <section className="panel transparency-panel">
      <div className="transparency-hero">
        <div>
          <p className="eyebrow">Data transparency</p>
          <h2>Control what {appName} can use.</h2>
          <p className="muted">Turn off anything you do not want this app to use before going back to consent.</p>
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
          <p className="eyebrow">Evidence</p>
          <h3>Signals this app may use</h3>
          <DisclosureList
            items={capturedData}
            empty="This app has not listed exact evidence fields yet. It should disclose the real fields it uses to produce understanding, such as URLs, page titles, selected text, transcripts, evidence snippets, or timestamps."
          />
        </section>

        <section className="permission-list transparency-card">
          <p className="eyebrow">Context objects</p>
          <h3>Memory and summaries</h3>
          <DisclosureList
            items={graphPackets}
            empty="This app has not listed exact context objects yet. If it writes or reads memory, it should describe the summaries, schema packets, evidence cards, nodes, edges, patterns, or aggregates it uses."
          />
        </section>

        <section className="permission-list transparency-card">
          <p className="eyebrow">Purpose</p>
          <h3>Why it wants access</h3>
          <DisclosureList
            items={dataUses}
            empty={app?.description || "This app has not provided a plain-language purpose for the context it wants from Memact yet."}
          />
        </section>

        <section className="permission-list transparency-card">
          <p className="eyebrow">Your controls</p>
          <h3>Allowed permissions</h3>
          <div className="transparency-control-list">
            {safeRequestedScopes.map((scope) => (
              <label className="transparency-control" key={scope}>
                <input
                  type="checkbox"
                  checked
                  disabled={safeRequestedScopes.length <= 1}
                  onChange={() => toggleScope(scope)}
                />
                <span>{scopes?.[scope]?.label || scope}</span>
              </label>
            ))}
            {!safeRequestedScopes.length ? <p className="muted">No permissions were attached to this transparency link.</p> : null}
          </div>
        </section>

        <section className="permission-list transparency-card">
          <p className="eyebrow">Your controls</p>
          <h3>Allowed activity</h3>
          <div className="transparency-control-list">
            {safeRequestedCategories.map((category) => (
              <label className="transparency-control" key={category}>
                <input
                  type="checkbox"
                  checked
                  disabled={safeRequestedCategories.length <= 1}
                  onChange={() => toggleCategory(category)}
                />
                <span>{categories?.[category]?.label || category}</span>
              </label>
            ))}
            {!safeRequestedCategories.length ? <p className="muted">No activity categories were attached to this transparency link.</p> : null}
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
