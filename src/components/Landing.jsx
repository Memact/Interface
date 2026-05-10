import React from "react"
import "../ui-fixes.css"

export function Landing({ isConnecting, showAuth, email, password, authLoading, authNotice, setEmail, setPassword, onEmailLogin, onPasswordLogin, onForgotPassword, onGithubLogin }) {
  return (
    <section className={showAuth ? "landing landing-with-auth" : "landing"}>
      <div className="hero-copy">
                <h1>{isConnecting ? "Review app access." : "Access Memact"}</h1>
        <p>
          {isConnecting
            ? "Sign in to review the app, requested scopes, and activity categories before connecting."
            : "Sign in to manage apps, permissions, and API keys."}
        </p>
      </div>

      {showAuth ? (
        <section className="panel auth-panel" aria-label="Memact login">
          <p className="eyebrow">Secure portal</p>
          <p className="muted auth-support">Sign in to manage apps, permissions, and API keys.</p>
          {authNotice ? <p className="notice notice-success" role="status">{authNotice}</p> : null}
          <form className="form" onSubmit={onPasswordLogin}>
            <label>
              Email
              <input value={email} type="email" inputMode="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              Password
              <input value={password} type="password" autoComplete="current-password" placeholder="Enter your password" onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <button type="submit" disabled={authLoading === "password"}>
              {authLoading === "password" ? "Signing in..." : "Continue"}
            </button>
            <button type="button" className="text-button" disabled={authLoading === "forgot-password"} onClick={onForgotPassword}>
              {authLoading === "forgot-password" ? "Sending reset link..." : "Forgot password?"}
            </button>
            <button type="button" className="ghost" disabled={authLoading === "email"} onClick={onEmailLogin}>
              {authLoading === "email" ? "Sending link..." : "Email me a login link"}
            </button>
          </form>
        </section>
      ) : null}
    </section>
  )
}
