import React from "react"
import "../ui-fixes.css"

export function Landing({ isConnecting, showAuth, email, password, authLoading, authNotice, setEmail, setPassword, onEmailLogin, onPasswordLogin, onForgotPassword, onGithubLogin }) {
  return (
    <section className={showAuth ? "landing landing-with-auth" : "landing"}>
      <div className="auth-intro">
        <div className="hero-copy hero-copy-compact">
          {isConnecting ? (
            <>
              <h1>Review app access.</h1>
              <p>Sign in to review the app, requested scopes, and activity categories before connecting.</p>
            </>
          ) : (
            <>
              <h1>Let apps remember only what you allow.</h1>
              <p>Memact lets apps use helpful info from your digital activity without giving them everything.</p>
              <div className="hero-points" aria-label="Memact principles">
                <span>Choose what apps can remember.</span>
                <span>Build with approved info.</span>
                <span>Keep memory permissioned.</span>
              </div>
            </>
          )}
        </div>
        <img className="auth-logo-img" src="/logo.png" alt="Memact" />
      </div>

      {showAuth ? (
        <section className="panel auth-panel" aria-label="Memact login">
          <p className="eyebrow">Secure portal</p>
          <p className="muted auth-support">Sign in to manage apps, permissions, and API keys.</p>
          {authNotice ? <p className="notice notice-success" role="status">{authNotice}</p> : null}
          <form className="form" onSubmit={onPasswordLogin}>
            <label>
              Email
              <input value={email} type="email" inputMode="email" autoComplete="email" placeholder="Enter your email" onChange={(event) => setEmail(event.target.value)} required />
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
            <div className="auth-divider" aria-hidden="true"><span>or</span></div>
            <button type="button" className="ghost" disabled={authLoading === "github"} onClick={onGithubLogin}>
              {authLoading === "github" ? "Opening GitHub..." : "Continue with GitHub"}
            </button>
          </form>
        </section>
      ) : null}
    </section>
  )
}
