import React, { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"
import {
  AccessClient,
  AccessApiError,
  ACCESS_MODE,
  ACCESS_URL
} from "./memact-access-client.js"
import { getAuthRedirectUrl, isSupabaseConfigured, requireSupabase, supabase } from "./supabase-client.js"
import { hasDuplicateAppName } from "./app-name.js"
import { defaultCategoriesForPolicy, defaultScopesForPolicy, normalizeSelectedCategories, normalizeSelectedScopes } from "./access-policy.js"
import { ConnectPage } from "./components/ConnectPage.jsx"
import { Dashboard } from "./components/Dashboard.jsx"
import { Landing } from "./components/Landing.jsx"
import { refreshDashboard, useDashboardState } from "./hooks/useDashboardState.js"

function App() {
  const client = useMemo(() => new AccessClient(ACCESS_URL), [])
  const [authSession, setAuthSession] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [activeTab, setActiveTab] = useState(window.location.pathname === "/dashboard" ? "access" : "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authLoading, setAuthLoading] = useState("")
  const [authNotice, setAuthNotice] = useState("")
  const [authFlow, setAuthFlow] = useState(() => detectAuthFlowFromUrl())
  const [dashboard, dashboardActions] = useDashboardState()
  const [policy, setPolicy] = useState(null)
  const [newAppName, setNewAppName] = useState("")
  const [newAppDescription, setNewAppDescription] = useState("")
  const [newAppDeveloperUrl, setNewAppDeveloperUrl] = useState("")
  const [newAppRedirectUrl, setNewAppRedirectUrl] = useState("")
  const [newAppCategories, setNewAppCategories] = useState(() => defaultCategoriesForPolicy(null))
  const [selectedAppId, setSelectedAppId] = useState("")
  const [selectedScopes, setSelectedScopes] = useState(() => defaultScopesForPolicy(null))
  const [selectedCategories, setSelectedCategories] = useState(() => defaultCategoriesForPolicy(null))
  const [oneTimeKey, setOneTimeKey] = useState("")
  const [oneTimeKeyId, setOneTimeKeyId] = useState("")
  const [oneTimeKeyScopes, setOneTimeKeyScopes] = useState([])
  const [oneTimeKeyCategories, setOneTimeKeyCategories] = useState([])
  const [apiTestResult, setApiTestResult] = useState("")
  const [showAppForm, setShowAppForm] = useState(false)
  const [connectRequest, setConnectRequest] = useState(() => parseConnectRequest())
  const [connectDetails, setConnectDetails] = useState(null)
  const [connectLoading, setConnectLoading] = useState("")
  const [connectNotice, setConnectNotice] = useState("")
  const [setupPassword, setSetupPassword] = useState("")
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [newEmailAddress, setNewEmailAddress] = useState("")
  const [emailChangeSuccess, setEmailChangeSuccess] = useState("")
  const { user, apps, apiKeys, consents, status, error, canRetryDashboard } = dashboard
  const { setStatus, setError, setCanRetryDashboard } = dashboardActions
  const session = authSession?.access_token || ""
  const passwordState = useMemo(() => getPasswordState(setupPassword, setupPasswordConfirm), [setupPassword, setupPasswordConfirm])
  const needsPasswordSetup = Boolean(authUser && shouldOfferPasswordSetup(authUser))

  useEffect(() => {
    client.health()
      .then(() => setStatus(ACCESS_MODE === "supabase" ? "Access is running through Supabase." : "Memact is online."))
      .catch(() => setStatus(ACCESS_MODE === "supabase" ? "Apply the Access Supabase migration to use the portal." : "Start Memact locally to use the portal."))
    client.policy().then(setPolicy).catch(() => {})
  }, [client])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthChecking(false)
      setStatus("Supabase env vars are missing.")
      return undefined
    }

    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        setError(error.message)
      }
      const nextSession = data?.session || null
      const detectedFlow = detectAuthFlowFromUrl()
      setAuthSession(nextSession)
      setAuthUser(nextSession?.user || null)
      setAuthFlow(detectedFlow)
      setAuthChecking(false)
      if (nextSession && isConnectPath()) {
        setActiveTab("connect")
      } else if (nextSession && window.location.pathname !== "/dashboard") {
        window.history.replaceState({}, "", "/dashboard")
      }
      if (!nextSession && window.location.pathname === "/dashboard") {
        window.history.replaceState({}, "", "/login")
        setActiveTab("login")
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return
      setAuthSession(nextSession)
      setAuthUser(nextSession?.user || null)
      if (event === "PASSWORD_RECOVERY") {
        setAuthFlow("recovery")
      } else if (event === "SIGNED_IN") {
        setAuthFlow(detectAuthFlowFromUrl())
      } else if (event === "SIGNED_OUT") {
        setAuthFlow("default")
      }
      if (nextSession) {
        if (isConnectPath()) {
          setActiveTab("connect")
        } else {
          setActiveTab(shouldOpenAccountTab(nextSession.user, event === "PASSWORD_RECOVERY" || detectAuthFlowFromUrl() === "recovery") ? "account" : "access")
          window.history.replaceState({}, "", "/dashboard")
        }
      }
    })

    return () => {
      mounted = false
      subscription?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return
    if (authFlow === "recovery") {
      setActiveTab("account")
      setStatus("Reset your password.")
      setAuthNotice("Choose a new password for your Memact account.")
      return
    }
    if (needsPasswordSetup) {
      setActiveTab("account")
      setStatus("Set a password to make your next login faster.")
    }
  }, [authFlow, needsPasswordSetup, session])

  useEffect(() => {
    const tabName = activeTab === "account" ? "Account" : activeTab === "help" ? "Help" : activeTab === "connect" ? "Connect" : activeTab === "access" ? "API Keys" : "Login"
    document.title = `Memact | ${tabName}`
  }, [activeTab])

  useEffect(() => {
    if (authChecking || !session) return
    refreshDashboard(client, session, dashboardActions, statusForAccessError)
  }, [authChecking, client, session])

  useEffect(() => {
    if (!isConnectPath()) return
    const request = parseConnectRequest()
    setConnectRequest(request)
    setActiveTab("connect")
    if (!session || !request.app_id) return

    let cancelled = false
    setConnectLoading("loading")
    setConnectNotice("")
    setStatus("Checking app connection.")
    client.getConnectApp(session, request)
      .then((details) => {
        if (cancelled) return
        setConnectDetails(details)
        setError("")
        setStatus("Review app connection.")
      })
      .catch((connectError) => {
        if (cancelled) return
        setError(connectError.message)
        setStatus("Connect app failed.")
      })
      .finally(() => {
        if (!cancelled) setConnectLoading("")
      })

    return () => {
      cancelled = true
    }
  }, [client, session])

  useEffect(() => {
    setNewAppCategories(defaultCategoriesForPolicy(policy))
  }, [policy])

  useEffect(() => {
    if (apps.length === 1 && selectedAppId !== apps[0].id) {
      setSelectedAppId(apps[0].id)
      return
    }
    if (selectedAppId && !apps.some((app) => app.id === selectedAppId)) {
      setSelectedAppId(apps[0]?.id || "")
      return
    }
    if (!selectedAppId && apps[0]?.id) {
      setSelectedAppId(apps[0].id)
    }
  }, [apps, selectedAppId])

  function handleSelectApp(appId) {
    setSelectedAppId(appId)
    setOneTimeKey("")
    setOneTimeKeyId("")
    setOneTimeKeyScopes([])
    setOneTimeKeyCategories([])
    setApiTestResult("")
  }

  useEffect(() => {
    if (!selectedAppId) return
    const selectedApp = apps.find((app) => app.id === selectedAppId)
    const appConsent = consents.find((consent) => consent.app_id === selectedAppId && !consent.revoked_at)
    const nextScopes = appConsent?.scopes?.length ? appConsent.scopes : defaultScopesForPolicy(policy)
    const nextCategories = selectedApp?.default_categories?.length ? selectedApp.default_categories : defaultCategoriesForPolicy(policy)
    setSelectedScopes(normalizeSelectedScopes(nextScopes, policy))
    setSelectedCategories(normalizeSelectedCategories(nextCategories, policy))
  }, [apps, consents, policy, selectedAppId])

  async function handleEmailLogin(event) {
    event.preventDefault()
    setError("")
    setAuthNotice("")
    setAuthLoading("email")
    setStatus("Sending login link.")
    try {
      const { error: otpError } = await requireSupabase().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getAuthRedirectTarget()
        }
      })
      if (otpError) throw otpError
      setAuthNotice("Check your email for the login link.")
      setStatus("Login link sent.")
    } catch (authError) {
      setError(authError.message)
      setStatus(authStatusMessage(authError))
    } finally {
      setAuthLoading("")
    }
  }

  async function handlePasswordLogin(event) {
    event.preventDefault()
    setError("")
    setAuthNotice("")
    setPasswordSuccess("")
    setAuthLoading("password")
    setStatus("Signing in.")
    try {
      const auth = requireSupabase()
      const { data, error: signInError } = await auth.auth.signInWithPassword({
        email,
        password
      })
      if (signInError) throw signInError
      setPassword("")
      const signedInUser = data?.user
      if (signedInUser && !signedInUser.user_metadata?.memact_password_ready) {
        const { data: updated, error: updateError } = await auth.auth.updateUser({
          data: {
            ...signedInUser.user_metadata,
            memact_password_ready: true,
            memact_password_updated_at: new Date().toISOString()
          }
        })
        if (updateError) throw updateError
        if (updated?.user) {
          setAuthUser(updated.user)
        }
      }
      setStatus("Signed in.")
    } catch (authError) {
      setError(passwordLoginErrorMessage(authError))
      setStatus(authStatusMessage(authError))
    } finally {
      setAuthLoading("")
    }
  }

  async function handleForgotPassword() {
    setError("")
    setPasswordSuccess("")
    setEmailChangeSuccess("")
    if (!email.trim()) {
      setError("Enter your email first so Memact knows where to send the reset link.")
      return
    }
    setAuthLoading("forgot-password")
    setStatus("Sending password reset link.")
    try {
      const { error: resetError } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAuthRedirectTarget()
      })
      if (resetError) throw resetError
      setAuthNotice("Check your email for the password reset link.")
      setStatus("Password reset link sent.")
    } catch (resetError) {
      setError(String(resetError?.message || "Could not send the password reset link."))
      setStatus(authStatusMessage(resetError))
    } finally {
      setAuthLoading("")
    }
  }

  async function handleGithubLogin() {
    setError("")
    setAuthNotice("")
    setAuthLoading("github")
    setStatus("Opening GitHub login.")
    try {
      const { error: oauthError } = await requireSupabase().auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: getAuthRedirectTarget()
        }
      })
      if (oauthError) throw oauthError
    } catch (authError) {
      setError(authError.message)
      setStatus(authStatusMessage(authError))
      setAuthLoading("")
    }
  }

  async function handleSetPassword(event) {
    event.preventDefault()
    setError("")
    setPasswordSuccess("")
    const validationMessage = passwordState.errors[0] || ""
    if (validationMessage) {
      setError(validationMessage)
      return
    }
    setAuthLoading("set-password")
    setStatus("Saving password.")
    try {
      const { data, error: updateError } = await requireSupabase().auth.updateUser({
        password: setupPassword,
        data: {
          ...(authUser?.user_metadata || {}),
          memact_password_ready: true,
          memact_password_updated_at: new Date().toISOString()
        }
      })
      if (updateError) throw updateError
      if (data?.user) {
        setAuthUser(data.user)
      }
      setSetupPassword("")
      setSetupPasswordConfirm("")
      setAuthFlow("default")
      setAuthNotice("")
      setPasswordSuccess("Password saved. Next time you can sign in with email and password.")
      setStatus("Password ready.")
    } catch (passwordError) {
      setError(passwordSetupErrorMessage(passwordError))
      setStatus(authStatusMessage(passwordError))
    } finally {
      setAuthLoading("")
    }
  }

  async function handleChangeEmail(event) {
    event.preventDefault()
    setError("")
    setEmailChangeSuccess("")
    const nextEmail = newEmailAddress.trim().toLowerCase()
    if (!nextEmail) {
      setError("Enter the new email address first.")
      return
    }
    if (nextEmail === (authUser?.email || "").toLowerCase()) {
      setError("Use a different email address.")
      return
    }
    setAuthLoading("change-email")
    setStatus("Sending email change confirmation.")
    try {
      const { data, error: updateError } = await requireSupabase().auth.updateUser({
        email: nextEmail
      })
      if (updateError) throw updateError
      if (data?.user) {
        setAuthUser(data.user)
      }
      setNewEmailAddress("")
      setEmailChangeSuccess("Check both email inboxes to confirm the change, based on your Supabase email settings.")
      setStatus("Email change started.")
    } catch (emailError) {
      setError(String(emailError?.message || "Email change did not finish."))
      setStatus(authStatusMessage(emailError))
    } finally {
      setAuthLoading("")
    }
  }

  async function handleCreateApp(event) {
    event.preventDefault()
    setError("")
    setCanRetryDashboard(false)
    const cleanName = newAppName.trim()
    if (!cleanName) {
      setError("App name is required.")
      scrollElementIntoView("error-message")
      return
    }
    if (hasDuplicateAppName(apps, cleanName)) {
      setError("You already have an app with this name.")
      scrollElementIntoView("error-message")
      return
    }
    try {
      const result = await client.createApp(session, {
        name: cleanName,
        description: newAppDescription.trim(),
        developer_url: newAppDeveloperUrl.trim(),
        redirect_urls: newAppRedirectUrl.trim() ? [newAppRedirectUrl.trim()] : [],
        categories: normalizeSelectedCategories(newAppCategories, policy)
      })
      await refreshDashboard(client, session, dashboardActions, statusForAccessError)
      setSelectedAppId(result.app.id)
      setShowAppForm(false)
      setNewAppName("")
      setNewAppDescription("")
      setNewAppDeveloperUrl("")
      setNewAppRedirectUrl("")
      setNewAppCategories(defaultCategoriesForPolicy(policy))
      setOneTimeKey("")
      setOneTimeKeyId("")
      setOneTimeKeyScopes([])
      setOneTimeKeyCategories([])
      setApiTestResult("")
      setStatus("App created.")
      scrollElementIntoView("permissions-panel")
    } catch (appError) {
      setError(appError.message)
      setStatus(statusForAccessError(appError).status)
      scrollElementIntoView("error-message")
    }
  }

  async function handleRetryDashboard() {
    if (authChecking || !session) return
    await refreshDashboard(client, session, dashboardActions, statusForAccessError)
  }

  async function handleDeleteApp() {
    if (!selectedAppId) return
    const app = apps.find((item) => item.id === selectedAppId)
    const appName = app?.name || "this app"
    const confirmed = window.confirm(`Delete ${appName}? Its API keys will stop working.`)
    if (!confirmed) return
    setError("")
    setCanRetryDashboard(false)
    setStatus("Deleting app.")
    try {
      await client.deleteApp(session, selectedAppId)
      setSelectedAppId("")
      setOneTimeKey("")
      setOneTimeKeyId("")
      setOneTimeKeyScopes([])
      setOneTimeKeyCategories([])
      setApiTestResult("")
      await refreshDashboard(client, session, dashboardActions, statusForAccessError)
      setStatus("App deleted.")
      scrollElementIntoView("app-panel")
    } catch (deleteError) {
      setError(deleteError.message)
      setStatus(statusForAccessError(deleteError).status)
      scrollElementIntoView("error-message")
    }
  }

  async function handleGrantConsent() {
    setError("")
    const selectedApp = apps.find((app) => app.id === selectedAppId)
    try {
      await client.grantConsent(session, {
        app_id: selectedAppId,
        scopes: normalizeSelectedScopes(selectedScopes, policy),
        categories: normalizeSelectedCategories(selectedApp?.default_categories || selectedCategories, policy)
      })
      await refreshDashboard(client, session, dashboardActions, statusForAccessError)
      setStatus("Permissions saved.")
      scrollElementIntoView("permissions-panel")
    } catch (consentError) {
      setError(consentError.message)
      scrollElementIntoView("error-message")
    }
  }

  async function handleCreateKey() {
    setError("")
    setOneTimeKey("")
    setOneTimeKeyId("")
    setOneTimeKeyScopes([])
    setOneTimeKeyCategories([])
    const keyScopes = normalizeSelectedScopes(selectedScopes, policy)
    const selectedApp = apps.find((app) => app.id === selectedAppId)
    const permissionCategories = normalizeSelectedCategories(selectedApp?.default_categories || selectedCategories, policy)
    try {
      const result = await client.createApiKey(session, {
        app_id: selectedAppId,
        name: "Default app key",
        scopes: keyScopes
      })
      await refreshDashboard(client, session, dashboardActions, statusForAccessError)
      setOneTimeKey(result.key)
      setOneTimeKeyId(result.api_key?.id || "")
      setOneTimeKeyScopes(keyScopes)
      setOneTimeKeyCategories(permissionCategories)
      setApiTestResult("")
      setStatus("API key created. Copy it now.")
      scrollElementIntoView("one-time-key-panel")
    } catch (keyError) {
      setError(keyError.message)
      scrollElementIntoView("error-message")
    }
  }

  async function handleRevokeKey(keyId) {
    setError("")
    try {
      await client.revokeApiKey(session, keyId)
      if (keyId === oneTimeKeyId) {
        setOneTimeKey("")
        setOneTimeKeyId("")
        setOneTimeKeyScopes([])
        setOneTimeKeyCategories([])
        setApiTestResult("")
      }
      await refreshDashboard(client, session, dashboardActions, statusForAccessError)
      setStatus("API key revoked.")
      scrollElementIntoView("api-keys-panel")
    } catch (keyError) {
      setError(keyError.message)
      scrollElementIntoView("error-message")
    }
  }

  async function copyOneTimeKey() {
    if (!oneTimeKey) return
    try {
      await navigator.clipboard.writeText(oneTimeKey)
      setStatus("API key copied.")
    } catch {
      setStatus("Copy failed. Select the key manually.")
    }
  }

  async function testOneTimeKey() {
    if (!oneTimeKey) return
    setError("")
    setApiTestResult("")
    setStatus("Testing API key.")
    try {
      const result = await client.verifyApiKey(oneTimeKey, oneTimeKeyScopes, oneTimeKeyCategories)
      const verifiedScopes = Array.isArray(result.scopes) ? result.scopes : []
      setApiTestResult(`Verified for ${verifiedScopes.length} scope${verifiedScopes.length === 1 ? "" : "s"}.`)
      setStatus("API key works.")
      scrollElementIntoView("one-time-key-panel")
    } catch (testError) {
      setError(testError.message)
      setStatus("API key test failed.")
      scrollElementIntoView("error-message")
    }
  }

  async function handleConnectApprove() {
    if (!connectRequest?.app_id) return
    setError("")
    setConnectNotice("")
    setConnectLoading("approve")
    setStatus("Connecting app.")
    try {
      const result = await client.connectApp(session, connectRequest)
      const connectionId = result?.consent?.id || ""
      setConnectNotice("App connected. You can close this tab or return to the app.")
      setStatus("App connected.")
      if (connectRequest.redirect_uri) {
        window.location.href = buildConnectRedirect(connectRequest.redirect_uri, {
          connected: "1",
          connection_id: connectionId,
          state: connectRequest.state
        })
      }
    } catch (connectError) {
      setError(connectError.message)
      setStatus("Connect app failed.")
      scrollElementIntoView("error-message")
    } finally {
      setConnectLoading("")
    }
  }

  function handleConnectCancel() {
    setStatus("Connection cancelled.")
    if (connectRequest.redirect_uri) {
      window.location.href = buildConnectRedirect(connectRequest.redirect_uri, {
        connected: "0",
        state: connectRequest.state
      })
      return
    }
    window.history.replaceState({}, "", "/dashboard")
    setActiveTab("access")
  }

  async function signOut() {
    setError("")
    setStatus("Signing out.")
    try {
      if (supabase) {
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) throw signOutError
      }
    } catch (signOutError) {
      setError(signOutError.message)
    }
    setAuthSession(null)
    setAuthUser(null)
    dashboardActions.resetData()
    setOneTimeKey("")
    setOneTimeKeyId("")
    setOneTimeKeyScopes([])
    setOneTimeKeyCategories([])
    setApiTestResult("")
    setActiveTab("login")
    setStatus("Signed out.")
    window.history.replaceState({}, "", "/login")
  }

  const scopes = policy?.scopes || {}
  const showAuth = !session
  const statusNeedsAttention = /missing|failed|offline/i.test(status)
  const showStatusPill = Boolean(error || statusNeedsAttention)

  return (
    <main className={showAuth ? "page page-auth" : "page"}>
      <header className="topbar">
        <a className="logo-link" href="https://www.memact.com/" aria-label="Go to memact.com">
          <img className="logo-img" src="/logo.png" alt="Memact" />
        </a>
        {session ? (
          <nav className="tabs" aria-label="Memact portal tabs">
            <button type="button" className={activeTab === "access" ? "tab is-active" : "tab"} onClick={() => setActiveTab("access")}>Access</button>
            <button type="button" className={activeTab === "account" ? "tab is-active" : "tab"} onClick={() => setActiveTab("account")}>Account</button>
            <button type="button" className={activeTab === "help" ? "tab is-active" : "tab"} onClick={() => setActiveTab("help")}>Help</button>
          </nav>
        ) : null}
        {showStatusPill ? <span className="status-pill" aria-live="polite">{status}</span> : null}
      </header>

      {error ? <p id="error-message" className="notice notice-danger" role="alert">{error} {canRetryDashboard ? <button type="button" className="inline-retry" onClick={handleRetryDashboard}>Retry</button> : null}</p> : null}
      {authChecking ? <p className="status-line">Checking login.</p> : null}

      {session && activeTab === "connect" ? (
        <ConnectPage
          connectRequest={connectRequest}
          connectDetails={connectDetails}
          loading={connectLoading}
          notice={connectNotice}
          onApprove={handleConnectApprove}
          onCancel={handleConnectCancel}
        />
      ) : session ? (
        <Dashboard
          activeTab={activeTab}
          user={user}
          authUser={authUser}
          apps={apps}
          apiKeys={apiKeys}
          consents={consents}
          scopes={scopes}
          categories={policy?.activity_categories || {}}
          selectedAppId={selectedAppId}
          selectedScopes={selectedScopes}
          selectedCategories={selectedCategories}
          newAppName={newAppName}
          newAppDescription={newAppDescription}
          newAppDeveloperUrl={newAppDeveloperUrl}
          newAppRedirectUrl={newAppRedirectUrl}
          newAppCategories={newAppCategories}
          oneTimeKey={oneTimeKey}
          oneTimeKeyScopes={oneTimeKeyScopes}
          oneTimeKeyCategories={oneTimeKeyCategories}
          apiTestResult={apiTestResult}
          showAppForm={showAppForm}
          setSelectedAppId={handleSelectApp}
          setSelectedScopes={setSelectedScopes}
          setNewAppName={setNewAppName}
          setNewAppDescription={setNewAppDescription}
          setNewAppDeveloperUrl={setNewAppDeveloperUrl}
          setNewAppRedirectUrl={setNewAppRedirectUrl}
          setNewAppCategories={setNewAppCategories}
          setShowAppForm={setShowAppForm}
          onCreateApp={handleCreateApp}
          onDeleteApp={handleDeleteApp}
          onGrantConsent={handleGrantConsent}
          onCreateKey={handleCreateKey}
          onRevokeKey={handleRevokeKey}
          onCopyKey={copyOneTimeKey}
          onTestKey={testOneTimeKey}
          onSignOut={signOut}
          authLoading={authLoading}
          needsPasswordSetup={needsPasswordSetup}
          setupPassword={setupPassword}
          setupPasswordConfirm={setupPasswordConfirm}
          passwordState={passwordState}
          passwordSuccess={passwordSuccess}
          setSetupPassword={setSetupPassword}
          setSetupPasswordConfirm={setSetupPasswordConfirm}
          onSetPassword={handleSetPassword}
          newEmailAddress={newEmailAddress}
          setNewEmailAddress={setNewEmailAddress}
          emailChangeSuccess={emailChangeSuccess}
          authFlow={authFlow}
          onChangeEmail={handleChangeEmail}
        />
      ) : (
        <Landing
          isConnecting={Boolean(connectRequest?.app_id && isConnectPath())}
          showAuth={showAuth}
          email={email}
          password={password}
          authLoading={authLoading}
          authNotice={authNotice}
          setEmail={setEmail}
          setPassword={setPassword}
          onEmailLogin={handleEmailLogin}
          onPasswordLogin={handlePasswordLogin}
          onForgotPassword={handleForgotPassword}
          onGithubLogin={handleGithubLogin}
        />
      )}
    </main>
  )
}

function statusForAccessError(error) {
  if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(String(error?.message || ""))) {
    return {
      message: ACCESS_MODE === "supabase" ? "Could not reach Supabase Access. Check the Website env vars and project settings." : "Could not reach Access. Make sure it is running.",
      status: ACCESS_MODE === "supabase" ? "Supabase Access offline." : "Access offline."
    }
  }
  if (error instanceof AccessApiError) {
    if (error.status === 401) return { message: "Please sign in again.", status: "Login expired." }
    if (error.status === 403) return { message: "Access denied for this dashboard.", status: "Access denied." }
    if (error.status === 409) return { message: "This app already exists.", status: "Dashboard sync failed." }
    if (error.status >= 500) return { message: ACCESS_MODE === "supabase" ? "Supabase Access needs the SQL migration or project setup." : "Access service had a server error. Check Access logs.", status: "Dashboard sync failed." }
  }
  return {
    message: error?.message || "Dashboard sync failed.",
    status: "Dashboard sync failed."
  }
}


function authStatusMessage(error) {
  const message = String(error?.message || "").toLowerCase()
  if (message.includes("failed to fetch") || message.includes("networkerror")) {
    return "Login did not connect."
  }
  if (message.includes("supabase is not configured")) {
    return "Supabase env vars are missing."
  }
  return "Login did not finish."
}

function passwordLoginErrorMessage(error) {
  const message = String(error?.message || "")
  if (/invalid login credentials/i.test(message)) {
    return "Email or password did not match. You can use the email link if this is your first login."
  }
  return message || "Password login did not finish."
}

function passwordSetupErrorMessage(error) {
  const message = String(error?.message || "")
  if (/same password/i.test(message)) {
    return "Choose a new password that is different from the last one."
  }
  if (/password/i.test(message) && /weak|short|strength/i.test(message)) {
    return "Use a stronger password before saving it."
  }
  return message || "Password setup did not finish."
}

function shouldOfferPasswordSetup(user) {
  if (!user) return false
  const provider = user.app_metadata?.provider || user.identities?.[0]?.provider || "email"
  if (provider !== "email") return false
  return !Boolean(user.user_metadata?.memact_password_ready)
}

function shouldOpenAccountTab(user, isRecoveryFlow) {
  return isRecoveryFlow || shouldOfferPasswordSetup(user)
}

function detectAuthFlowFromUrl() {
  if (typeof window === "undefined") return "default"
  const query = `${window.location.search || ""}${window.location.hash || ""}`.toLowerCase()
  if (query.includes("type=recovery")) return "recovery"
  return "default"
}

function isConnectPath() {
  return typeof window !== "undefined" && window.location.pathname === "/connect"
}

function parseConnectRequest() {
  if (typeof window === "undefined") {
    return { app_id: "", scopes: [], categories: [], redirect_uri: "", state: "" }
  }
  const params = new URLSearchParams(window.location.search)
  return {
    app_id: params.get("app_id") || "",
    scopes: parseListParam(params.get("scopes")),
    categories: parseListParam(params.get("categories")),
    redirect_uri: params.get("redirect_uri") || "",
    state: params.get("state") || ""
  }
}

function parseListParam(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function getAuthRedirectTarget() {
  if (isConnectPath()) {
    return window.location.href
  }
  return getAuthRedirectUrl()
}

function buildConnectRedirect(redirectUri, values) {
  try {
    const url = new URL(redirectUri)
    Object.entries(values || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value)
      }
    })
    return url.toString()
  } catch {
    return "/dashboard"
  }
}

function getPasswordState(password, confirmPassword) {
  const checks = [
    { label: "At least 12 characters", ok: password.length >= 12 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One number", ok: /\d/.test(password) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
    { label: "Passwords match", ok: password.length > 0 && password === confirmPassword }
  ]
  const passedCount = checks.filter((check) => check.ok).length
  const percent = Math.round((passedCount / checks.length) * 100)
  const level = percent >= 100 ? "strong" : percent >= 67 ? "good" : percent >= 34 ? "fair" : "weak"
  const label = level === "strong" ? "Strong password" : level === "good" ? "Good password" : level === "fair" ? "Needs more strength" : "Weak password"
  const errors = checks.filter((check) => !check.ok).map((check) => check.label)
  return {
    checks,
    percent,
    level,
    label,
    errors,
    canSubmit: errors.length === 0
  }
}

function scrollElementIntoView(id) {
  if (typeof window === "undefined") return
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    })
  })
}

createRoot(document.getElementById("root")).render(<App />)
