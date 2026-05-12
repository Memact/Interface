import React from "react"

export function ConnectPage({ connectRequest, connectDetails, loading, notice, onApprove, onCancel, onLearnMore }) {
  const app = connectDetails?.app
  const scopes = connectDetails?.scopes || {}
  const categories = connectDetails?.activity_categories || {}
  const requestedScopes = connectDetails?.requested_scopes || connectRequest?.scopes || []
  const requestedCategories = connectDetails?.requested_categories || connectRequest?.categories || []
  const appName = app?.name || "this app"

  return (
    <section className="connect-shell">
      <article className="panel connect-card">
        <p className="eyebrow">Permission request</p>
        <h1>{appName} wants to connect.</h1>
        <div className="app-identity">
          <span className="app-avatar" aria-hidden="true">{appName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{appName}</strong>
            {app?.developer_url ? (
              <a className="muted" href={app.developer_url} target="_blank" rel="noreferrer">{app.developer_url}</a>
            ) : <span className="muted">Developer URL not provided.</span>}
          </div>
        </div>
        <p className="muted">
          Review the exact permissions and activity categories before approving. You can disconnect this app later from Memact Access.
        </p>
        <button type="button" className="learn-more-link connect-learn-more" onClick={onLearnMore}>Learn More</button>

        {loading === "loading" ? <p className="status-line">Loading app details.</p> : null}
        {notice ? <p className="notice notice-success" role="status">{notice}</p> : null}

        <div className="connect-grid">
          <section className="permission-list">
            <p className="eyebrow">Permissions</p>
            {requestedScopes.length ? requestedScopes.map((scope) => (
              <div className="mini-row" key={scope}>
                <strong>{scopeLabel(scopes, scope)}</strong>
                <small>{scopes[scope]?.description || scope}</small>
              </div>
            )) : <p className="muted">No permissions requested.</p>}
          </section>
          <section className="permission-list">
            <p className="eyebrow">Activity categories</p>
            {requestedCategories.length ? requestedCategories.map((category) => (
              <div className="mini-row" key={category}>
                <strong>{categoryLabel(categories, category)}</strong>
                <small>{categories[category]?.description || category}</small>
              </div>
            )) : <p className="muted">No categories requested.</p>}
          </section>
        </div>

        <section className="permission-list">
          <p className="eyebrow">Safety boundary</p>
          <div className="mini-row">
            <strong>No raw memory dump by default.</strong>
            <small>Memact verifies the app, user permission, requested scopes, and selected categories before allowing access.</small>
          </div>
          <div className="mini-row">
            <strong>Blocked uses stay blocked.</strong>
            <small>Apps may not use Memact for surveillance, selling raw personal memory, manipulative targeting, or sensitive eligibility decisions.</small>
          </div>
        </section>

        <div className="connect-actions">
          <button type="button" onClick={onApprove} disabled={!app?.id || loading === "approve"}>
            {loading === "approve" ? "Connecting..." : "Approve connection"}
          </button>
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        </div>
      </article>
    </section>
  )
}

function scopeLabel(scopes, scope) {
  return scopes?.[scope]?.label || scope
}

function categoryLabel(categories, category) {
  return categories?.[category]?.label || category
}
