import React from "react"
import "../ui-fixes.css"
import "../landing-polish.css"
import "../desktop-landing-lift.css"
import "../mobile-wide-auth.css"

export function Landing({ isConnecting, showAuth, email, password, authLoading, authNotice, setEmail, setPassword, onEmailLogin, onPasswordLogin, onForgotPassword, onGithubLogin }) {
  const handleSignInScroll = (event) => {
    event.preventDefault()
    const target = document.getElementById("sign-in")
    if (!target) return

    target.scrollIntoView({ behavior: "auto", block: "center" })
    target.querySelector("input")?.focus({ preventScroll: true })
  }

  return (
    <section className={showAuth ? "landing landing-with-auth" : "landing"}>
      <div className="auth-intro">
        <div className="auth-side">
          <img className="auth-logo-img" src="/logo.png" alt="Memact" />
        </div>

        <div className="hero-copy hero-copy-compact">
          {isConnecting ? (
            <>
              <h1>Review app access.</h1>
              <p>Sign in to review the app, requested scopes, and activity categories before connecting.</p>
            </>
          ) : (
            <>
              <h1>Let apps remember<br />only what the user allows.</h1>
              <p>Memact lets apps use helpful info from a user's digital activity without giving them everything.</p>
              {showAuth ? <a className="scroll-to-auth" href="#sign-in" onClick={handleSignInScroll}>Sign in</a> : null}
            </>
          )}
        </div>

        {showAuth ? (
          <section id="sign-in" className="panel auth-panel" aria-label="Memact login">
            <img className="auth-panel-logo" src="/logo.png" alt="Memact" />
            <p className="eyebrow">Sign in</p>
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
      </div>
    </section>
  )
}
