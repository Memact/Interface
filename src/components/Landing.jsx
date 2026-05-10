import React from "react"

export function Landing({ isConnecting, showAuth, email, password, authLoading, authNotice, setEmail, setPassword, onEmailLogin, onPasswordLogin, onForgotPassword, onGithubLogin }) {
  return (
    <section className={showAuth ? "landing landing-with-auth" : "landing"}>
      <div className="hero-copy">
        <h1>{isConnecting ? "Sign in to connect Memact." : "Manage access to Memact."}</h1>
        <p>
          {isConnecting
            ? "Memact will show the app name, exact permissions, and activity categories before anything is connected."
            : "Sign in, register apps, save permissions, and create scoped API keys. Apps can use Memact through clear permissions while your memory data stays protected by default."}
        </p>
      </div>

      {showAuth ? (
        <section className="panel auth-panel" aria-label="Memact login">
          <p className="eyebrow">Welcome</p>
          <h2>Sign in to Memact.</h2>
          <p className="muted">
            Use your email and password, or start with a secure email link and set a password right after.
          </p>
          {authNotice ? <p className="success" role="status">{authNotice}</p> : null}
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
              {authLoading === "password" ? "Signing in..." : "Continue with Password"}
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
