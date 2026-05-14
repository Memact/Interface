import React, { useEffect, useState } from "react"
import "../memact-ui.css"
import "../landing-polish.css"
import "../desktop-landing-lift.css"
import "../mobile-wide-auth.css"

export function Landing({
  isConnecting,
  showAuth,
  email,
  signupDisplayName,
  password,
  passwordConfirm,
  pendingVerificationEmail,
  verificationCode,
  passwordState,
  authMode,
  authLoading,
  lastAuthMethod,
  setEmail,
  setSignupDisplayName,
  setPassword,
  setPasswordConfirm,
  setVerificationCode,
  setAuthMode,
  onEmailSignup,
  onVerifySignupCode,
  onEmailLogin,
  onPasswordLogin,
  onForgotPassword,
  onResendConfirmation,
  onClearPendingVerification,
  onGithubLogin,
  onLearnMore
}) {
  const isSignIn = authMode === "sign-in"
  const isVerificationStep = !isSignIn && Boolean(pendingVerificationEmail)
  const [signupStep, setSignupStep] = useState("identity")

  useEffect(() => {
    if (pendingVerificationEmail && !isSignIn) {
      setSignupStep("verify")
      return
    }
    setSignupStep("identity")
  }, [authMode, isSignIn, pendingVerificationEmail])

  const handleAuthScroll = (event, mode = "sign-up") => {
    event.preventDefault()
    setAuthMode(mode)
    window.requestAnimationFrame(() => {
      const target = document.getElementById(mode)
      if (!target) return

      target.scrollIntoView({ behavior: "smooth", block: "center" })
      target.querySelector("input")?.focus({ preventScroll: true })
    })
  }

  const goToSignupPassword = () => {
    const cleanName = signupDisplayName.trim().replace(/\s+/g, " ")
    if (cleanName.length < 2) {
      document.getElementById("signup-display-name")?.focus()
      return
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      document.getElementById("signup-email")?.focus()
      return
    }
    setSignupStep("password")
    window.requestAnimationFrame(() => {
      document.getElementById("signup-password")?.focus()
    })
  }

  const goBackToSignupIdentity = () => {
    setSignupStep("identity")
    window.requestAnimationFrame(() => {
      document.getElementById("signup-email")?.focus()
    })
  }

  const handleSignupSubmit = (event) => {
    if (isVerificationStep) {
      onVerifySignupCode(event)
      return
    }
    if (signupStep === "identity") {
      event.preventDefault()
      goToSignupPassword()
      return
    }
    onEmailSignup(event)
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
              {isSignIn
                ? "Sign in to manage apps, permissions, and API keys."
                : isVerificationStep
                ? `Enter the code sent to ${pendingVerificationEmail}.`
                : signupStep === "identity"
                ? "First, tell Memact who you are."
                : "Now create a strong password for your account."}
            </p>
            {!isSignIn ? (
              <div className={isVerificationStep ? "auth-progress auth-progress-three" : "auth-progress"} aria-label="Sign up progress">
                <span className="is-active" />
                <span className={signupStep === "password" || isVerificationStep ? "is-active" : ""} />
                {isVerificationStep ? <span className="is-active" /> : null}
              </div>
            ) : null}
            {isSignIn && lastAuthMethod ? <p className="last-auth-chip">Last used: {lastAuthMethod}</p> : null}
            <form className="form" onSubmit={isSignIn ? onPasswordLogin : handleSignupSubmit}>
              {isVerificationStep ? (
                <label>
                  Verification code
                  <input
                    className="verification-code-input"
                    value={verificationCode}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={10}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\s+/g, "").slice(0, 10))}
                    required
                  />
                </label>
              ) : null}
              {!isVerificationStep && !isSignIn && signupStep === "identity" ? (
                <label>
                  Display name
                  <input id="signup-display-name" value={signupDisplayName} type="text" autoComplete="name" placeholder="What should Memact call you?" maxLength={80} onChange={(event) => setSignupDisplayName(event.target.value)} required />
                </label>
              ) : null}
              {!isVerificationStep && (isSignIn || signupStep === "identity") ? <label>
                Email
                <input id={isSignIn ? "signin-email" : "signup-email"} value={email} type="email" inputMode="email" autoComplete="email" placeholder="Enter your email" onChange={(event) => setEmail(event.target.value)} required />
              </label> : null}
              {!isVerificationStep && (isSignIn || signupStep === "password") ? <label>
                Password
                <input id={isSignIn ? "signin-password" : "signup-password"} value={password} type="password" autoComplete={isSignIn ? "current-password" : "new-password"} placeholder={isSignIn ? "Enter your password" : "Create a strong password"} onChange={(event) => setPassword(event.target.value)} required />
              </label> : null}
              {!isVerificationStep && !isSignIn && signupStep === "password" ? (
                <label>
                  Confirm password
                  <input value={passwordConfirm} type="password" autoComplete="new-password" placeholder="Repeat the password" onChange={(event) => setPasswordConfirm(event.target.value)} required />
                </label>
              ) : null}
              {!isVerificationStep && !isSignIn && signupStep === "password" && passwordState ? (
                <>
                  <div className="password-strength signup-password-strength" data-strength={passwordState.level}>
                    <div className="password-strength-bar">
                      <span style={{ width: `${passwordState.percent}%` }} />
                    </div>
                    <strong>{passwordState.label}</strong>
                  </div>
                  <ul className="password-rules signup-password-rules" aria-label="Password requirements">
                    {passwordState.checks.map((check) => (
                      <li key={check.label} className={check.ok ? "is-passed" : ""}>{check.label}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              <button type="submit" disabled={authLoading === "password" || authLoading === "signup" || authLoading === "verify-signup"}>
                <span>{authLoading === "password" || authLoading === "signup" || authLoading === "verify-signup"
                  ? authLoading === "verify-signup" ? "Verifying email..." : isSignIn ? "Signing in..." : "Creating account..."
                  : isSignIn ? "Sign in" : isVerificationStep ? "Verify email" : signupStep === "identity" ? "Continue" : "Create account"}</span>
                {!isSignIn ? <span className="auth-native-chevron auth-submit-chevron" aria-hidden="true" /> : null}
              </button>
              {isVerificationStep ? (
                <>
                  <button type="button" className="text-button" disabled={authLoading === "resend-confirmation"} onClick={onResendConfirmation}>
                    {authLoading === "resend-confirmation" ? "Sending code..." : "Resend code"}
                  </button>
                  <button type="button" className="text-button" onClick={onClearPendingVerification}>Use a different email</button>
                </>
              ) : null}
              {!isVerificationStep && !isSignIn && signupStep === "password" ? (
                <button type="button" className="text-button" onClick={goBackToSignupIdentity}>Back to name and email</button>
              ) : null}
              {isSignIn ? (
                <>
                  <button type="button" className="text-button" disabled={authLoading === "forgot-password"} onClick={onForgotPassword}>
                    {authLoading === "forgot-password" ? "Sending reset link..." : "Forgot password?"}
                  </button>
                  <button type="button" className="text-button" disabled={authLoading === "resend-confirmation"} onClick={onResendConfirmation}>
                    {authLoading === "resend-confirmation" ? "Sending confirmation..." : "Resend confirmation email"}
                  </button>
                  <button type="button" className="ghost" disabled={authLoading === "email"} onClick={onEmailLogin}>
                    {authLoading === "email" ? "Sending link..." : "Email me a sign-in link"}
                  </button>
                </>
              ) : null}
              {!isVerificationStep ? <button type="button" className="text-button" onClick={(event) => handleAuthScroll(event, isSignIn ? "sign-up" : "sign-in")}>
                {isSignIn ? "New to Memact? Get started" : "Already have an account? Sign in"}
              </button> : null}
              {!isVerificationStep ? <div className="auth-divider" aria-hidden="true"><span>or</span></div> : null}
              {!isVerificationStep ? <button type="button" className="ghost" disabled={authLoading === "github"} onClick={onGithubLogin}>
                {authLoading === "github" ? "Opening GitHub..." : isSignIn ? "Sign in with GitHub" : "Sign up with GitHub"}
              </button> : null}
            </form>
          </section>
        ) : null}
      </div>
    </section>
  )
}
