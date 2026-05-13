import React from "react"
import "../memact-ui.css"
import "../landing-polish.css"
import "../desktop-landing-lift.css"
import "../mobile-wide-auth.css"

export function Landing({
  isConnecting,
  showAuth,
  email,
  password,
  passwordConfirm,
  authMode,
  authLoading,
  authNotice,
  setEmail,
  setPassword,
  setPasswordConfirm,
  setAuthMode,
  onEmailSignup,
  onEmailLogin,
  onPasswordLogin,
  onForgotPassword,
  onGithubLogin,
  onLearnMore
}) {
  const isSignIn = authMode === "sign-in"

  const handleAuthScroll = (event, mode = "sign-up") => {
    event.preventDefault()
    setAuthMode(mode)
    window.requestAnimationFrame(() => {
      const target = document.getElementById(mode)
      if (!target) return

      target.scrollIntoView({ behavior: "auto", block: "center" })
      target.querySelector("input")?.focus({ preventScroll: true })
    })
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
              <button type="button" className="learn-more-link" onClick={onLearnMore}>Learn more</button>
            </>
          ) : (
            <>
              <h1>Let apps remember<br />only what the user allows.</h1>
              <p>Memact lets apps use helpful info from a user's<br className="mobile-subtitle-break" /> digital activity without giving them everything.</p>
              {showAuth ? (
                <div className="landing-actions">
                  <a className="scroll-to-auth" href="/#sign-up" onClick={(event) => handleAuthScroll(event, "sign-up")}>Get started</a>
                  <button type="button" className="learn-more-link" onClick={onLearnMore}>Learn more</button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {showAuth ? (
          <section id={isSignIn ? "sign-in" : "sign-up"} className="panel auth-panel" aria-label={isSignIn ? "Memact sign in" : "Memact sign up"}>
            <img className="auth-panel-logo" src="/logo.png" alt="Memact" />
            <p className="eyebrow">{isSignIn ? "Sign in" : "Get started"}</p>
            <p className="muted auth-support">
              {isSignIn ? "Sign in to manage apps, permissions, and API keys." : "Create your Memact account to manage apps, permissions, and API keys."}
            </p>
            {authNotice ? <p className="notice notice-success" role="status">{authNotice}</p> : null}
            <form className="form" onSubmit={isSignIn ? onPasswordLogin : onEmailSignup}>
              <label>
                Email
                <input value={email} type="email" inputMode="email" autoComplete="email" placeholder="Enter your email" onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label>
                Password
                <input value={password} type="password" autoComplete={isSignIn ? "current-password" : "new-password"} placeholder={isSignIn ? "Enter your password" : "Create a strong password"} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              {!isSignIn ? (
                <label>
                  Confirm password
                  <input value={passwordConfirm} type="password" autoComplete="new-password" placeholder="Repeat the password" onChange={(event) => setPasswordConfirm(event.target.value)} required />
                </label>
              ) : null}
              <button type="submit" disabled={authLoading === "password" || authLoading === "signup"}>
                {authLoading === "password" || authLoading === "signup"
                  ? isSignIn ? "Signing in..." : "Creating account..."
                  : isSignIn ? "Sign in" : "Create account"}
              </button>
              {isSignIn ? (
                <>
                  <button type="button" className="text-button" disabled={authLoading === "forgot-password"} onClick={onForgotPassword}>
                    {authLoading === "forgot-password" ? "Sending reset link..." : "Forgot password?"}
                  </button>
                  <button type="button" className="ghost" disabled={authLoading === "email"} onClick={onEmailLogin}>
                    {authLoading === "email" ? "Sending link..." : "Email me a sign-in link"}
                  </button>
                </>
              ) : null}
              <button type="button" className="text-button" onClick={(event) => handleAuthScroll(event, isSignIn ? "sign-up" : "sign-in")}>
                {isSignIn ? "New to Memact? Get started" : "Already have an account? Sign in"}
              </button>
              <div className="auth-divider" aria-hidden="true"><span>or</span></div>
              <button type="button" className="ghost" disabled={authLoading === "github"} onClick={onGithubLogin}>
                {authLoading === "github" ? "Opening GitHub..." : isSignIn ? "Sign in with GitHub" : "Sign up with GitHub"}
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </section>
  )
}
