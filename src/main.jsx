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
import { DataTransparencyPage } from "./components/DataTransparencyPage.jsx"
import { Dashboard } from "./components/Dashboard.jsx"
import { HelpPanel } from "./components/HelpPanel.jsx"
import { Landing } from "./components/Landing.jsx"
import { refreshDashboard, useDashboardState } from "./hooks/useDashboardState.js"
import { isConnectPage, isProtectedPage, normalizePortalPath, pageFromLocation, routeForPage } from "./portal-routes.js"
import { getDisplayName } from "./user-display.js"

const AUTH_INIT_TIMEOUT_MS = 12000
const AUTH_CODE_EXCHANGE_TIMEOUT_MS = 9000
const AUTH_SESSION_CHECK_TIMEOUT_MS = 9000

function App() {
  const client = useMemo(() => new AccessClient(ACCESS_URL), [])
  const initialPage = pageFromLocation()
  const [authSession, setAuthSession] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [activeTab, setActiveTab] = useState(initialPage === "home" ? "login" : initialPage)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [authLoading, setAuthLoading] = useState("")
  const [authNotice, setAuthNotice] = useState("")
  const [authFlow, setAuthFlow] = useState(() => detectAuthFlowFromUrl())
  const [authMode, setAuthMode] = useState(() => authModeFromLocation())
  const [dashboard, dashboardActions] = useDashboardState()
  const [policy, setPolicy] = useState(null)
  const [newAppName, setNewAppName] = useState("")
  const [newAppDescription, setNewAppDescription] = useState("")
  const [newAppDeveloperUrl, setNewAppDeveloperUrl] = useState("")
  const [newAppRedirectUrl, setNewAppRedirectUrl] = useState("")
  const [newAppCategories, setNewAppCategories] = useState(() => defaultCategoriesForPolicy(null))
  const [selectedAppId, setSelectedAppId] = useState("")
  const [selectedScopes, setSelectedScopes] = useState(() => defaultScopesForPolicy(null))
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
  const [displayNameDraft, setDisplayNameDraft] = useState("")
  const [displayNameSuccess, setDisplayNameSuccess] = useState("")
  const { user, apps, apiKeys, consents, status, error, canRetryDashboard } = dashboard
  const { setStatus, setError, setCanRetryDashboard } = dashboardActions
  const session = authSession?.access_token || ""
  const passwordState = useMemo(() => getPasswordState(setupPassword, setupPasswordConfirm), [setupPassword, setupPasswordConfirm])
  const needsPasswordSetup = Boolean(authUser && shouldOfferPasswordSetup(authUser))

  function navigateToPage(page, { replace = false, hash = "" } = {}) {
    const nextPath = `${routeForPage(page)}${hash}`
    const historyMethod = replace ? "replaceState" : "pushState"
    window.history[historyMethod]({}, "", nextPath)
    setCurrentPage(page)
    setActiveTab(page === "home" ? "login" : page)
    if (page === "home" && hash) {
      setAuthMode(hash.toLowerCase().includes("sign-in") ? "sign-in" : "sign-up")
    }
  }

  function setLandingAuthMode(mode, { pushHash = true } = {}) {
    const nextMode = mode === "sign-in" ? "sign-in" : "sign-up"
    setAuthMode(nextMode)
    if (pushHash && typeof window !== "undefined") {
      window.history.pushState({}, "", `${routeForPage("home")}#${nextMode}`)
    }
  }

  function applySession(nextSession, detectedFlow = "default") {
    setAuthSession(nextSession)
    setAuthUser(nextSession?.user || null)
    setAuthFlow(detectedFlow)
    const page = pageFromLocation()

    if (nextSession && isConnectPage(page)) {
      setCurrentPage("connect")
      setActiveTab("connect")
      return
    }

    if (nextSession) {
      navigateToPage(shouldOpenAccountTab(nextSession.user, detectedFlow === "recovery") ? "account" : "access", { replace: true })
      return
    }

    if (isProtectedPage(page)) {
      navigateToPage("home", { replace: true, hash: "#sign-up" })
    }
  }

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

    const normalizedPath = normalizePortalPath(window.location.pathname)
    if (normalizedPath !== window.location.pathname) {
      window.history.replaceState({}, "", normalizedPath)
      const normalizedPage = pageFromLocation()
      setCurrentPage(normalizedPage)
      setActiveTab(normalizedPage === "home" ? "login" : normalizedPage)
    }

    let mounted = true
    const shouldCheckSession = shouldCheckSessionOnLoad()
    let sessionCheckTimeout

    if (!shouldCheckSession) {
      setAuthChecking(false)
    } else {
      sessionCheckTimeout = window.setTimeout(() => {
        if (!mounted) return
        setAuthChecking(false)
        setAuthNotice("Sign-in took too long. Try GitHub again from this page.")
        if (isProtectedPage(pageFromLocation())) {
          navigateToPage("home", { replace: true, hash: "#sign-up" })
        }
      }, AUTH_INIT_TIMEOUT_MS)

      resolveInitialSession(supabase)
        .then(({ data, error }) => {
          if (!mounted) return
          if (error) {
            setError(error.message)
          }
          const nextSession = data?.session || null
          if (!nextSession && isProtectedPage(pageFromLocation())) {
            setAuthNotice("Sign-in did not finish in this browser. Try GitHub again from this page.")
          }
          applySession(nextSession, detectAuthFlowFromUrl())
        })
        .catch((sessionError) => {
          if (!mounted) return
          setError(sessionError?.message || "Could not check login status.")
        })
        .finally(() => {
          if (!mounted) return
          window.clearTimeout(sessionCheckTimeout)
          setAuthChecking(false)
        })
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return
      setAuthChecking(false)

      if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        setAuthSession(nextSession)
        setAuthUser(nextSession?.user || null)
        return
      }

      if (event === "PASSWORD_RECOVERY") {
        setAuthFlow("recovery")
      } else if (event === "SIGNED_IN") {
        setAuthFlow(detectAuthFlowFromUrl())
      } else if (event === "SIGNED_OUT") {
        setAuthFlow("default")
      }
      applySession(nextSession, event === "PASSWORD_RECOVERY" ? "recovery" : detectAuthFlowFromUrl())
      if (!nextSession && event === "SIGNED_OUT") {
        if (isProtectedPage(pageFromLocation())) {
          navigateToPage("home", { replace: true, hash: "#sign-up" })
        }
      }
    })

    return () => {
      mounted = false
      window.clearTimeout(sessionCheckTimeout)
      subscription?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    function handlePopState() {
      const page = pageFromLocation()
      setCurrentPage(page)
      setActiveTab(page === "home" ? "login" : page)
      if (page === "home") {
        setAuthMode(authModeFromLocation())
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (!session) return
    if (authFlow === "recovery") {
      navigateToPage("account", { replace: true })
      setStatus("Reset your password.")
      setAuthNotice("Choose a new password for your Memact account.")
      return
    }
    if (needsPasswordSetup) {
      navigateToPage("account", { replace: true })
      setStatus("Set a password to make your next login faster.")
    }
  }, [authFlow, needsPasswordSetup, session])

  useEffect(() => {
    const tabName = currentPage === "account" ? "Account" : currentPage === "help" ? "Help" : currentPage === "connect" ? "Connect" : currentPage === "data" ? "Data Transparency" : currentPage === "access" ? "API Keys" : "Login"
    document.title = `Memact | ${tabName}`
  }, [currentPage])

  useEffect(() => {
    if (authChecking || !session) return
    refreshDashboard(client, session, dashboardActions, statusForAccessError)
  }, [authChecking, client, session])

  useEffect(() => {
    if (!isConnectPage(currentPage) && currentPage !== "data") return
    const request = parseConnectRequest()
    setConnectRequest(request)
    setActiveTab(currentPage)
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
  }, [client, currentPage, session])

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
    const appConsent = consents.find((consent) => consent.app_id === selectedAppId && !consent.revoked_at)
    const nextScopes = appConsent?.scopes?.length ? appConsent.scopes : defaultScopesForPolicy(policy)
    setSelectedScopes(normalizeSelectedScopes(nextScopes, policy))
  }, [apps, consents, policy, selectedAppId])

  useEffect(() => {
    if (!authUser) {
      setDisplayNameDraft("")
      setDisplayNameSuccess("")
      return
    }
    setDisplayNameDraft(authUser.user_metadata?.memact_display_name || "")
  }, [authUser?.id])

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
      setError(formatAuthErrorMessage(authError))
      setStatus(authStatusMessage(authError))
    } finally {
      setAuthLoading("")
    }
  }

  async function handleEmailSignup(event) {
    event.preventDefault()
    setError("")
    setAuthNotice("")
    setPasswordSuccess("")
    const validation = getPasswordState(password, passwordConfirm)
    if (validation.errors.length) {
      setError(validation.errors[0])
      return
    }
    setAuthLoading("signup")
    setStatus("Creating account.")
    try {
      const { data, error: signUpError } = await requireSupabase().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectTarget(),
          data: {
            memact_password_ready: true,
            memact_password_updated_at: new Date().toISOString()
          }
        }
      })
      if (signUpError) throw signUpError
      setPassword("")
      setPasswordConfirm("")
      if (data?.session) {
        setAuthChecking(false)
        applySession(data.session, "default")
        setStatus("Account created.")
      } else {
        setAuthNotice("Check your email to confirm your Memact account.")
        setStatus("Confirmation email sent.")
      }
    } catch (authError) {
      setError(formatAuthErrorMessage(authError, "Account creation did not finish."))
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
      setPasswordConfirm("")
      let signedInSession = data?.session || null
      const signedInUser = signedInSession?.user || data?.user || null

      if (!signedInSession) {
        const { data: sessionData, error: sessionError } = await auth.auth.getSession()
        if (sessionError) throw sessionError
        signedInSession = sessionData?.session || null
      }

      if (!signedInSession) {
        throw new Error("Login finished, but Memact did not receive a browser session. Refresh and try again.")
      }

      setAuthChecking(false)
      applySession(signedInSession, "default")
      markPasswordReadyInBackground(auth, signedInUser || signedInSession.user, setAuthUser)
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
      setError(formatAuthErrorMessage(resetError, "Could not send the password reset link."))
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
      setError(formatAuthErrorMessage(authError))
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
      setError(formatAuthErrorMessage(emailError, "Email change did not finish."))
      setStatus(authStatusMessage(emailError))
    } finally {
      setAuthLoading("")
    }
  }

  async function handleUpdateDisplayName(event) {
    event.preventDefault()
    setError("")
    setDisplayNameSuccess("")
    const cleanName = displayNameDraft.trim().replace(/\s+/g, " ").slice(0, 80)
    if (cleanName.length < 2) {
      setError("Use at least 2 characters for your display name.")
      scrollElementIntoView("error-message")
      return
    }
    setAuthLoading("display-name")
    setStatus("Saving display name.")
    try {
      const { data, error: updateError } = await requireSupabase().auth.updateUser({
        data: {
          ...(authUser?.user_metadata || {}),
          memact_display_name: cleanName,
          memact_display_name_updated_at: new Date().toISOString()
        }
      })
      if (updateError) throw updateError
      if (data?.user) {
        setAuthUser(data.user)
      }
      setDisplayNameDraft(cleanName)
      setDisplayNameSuccess("Display name saved.")
      setStatus("Display name saved.")
    } catch (displayNameError) {
      setError(formatAuthErrorMessage(displayNameError, "Display name did not save."))
      setStatus(authStatusMessage(displayNameError))
      scrollElementIntoView("error-message")
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
      const developerUrl = normalizeOptionalHttpUrl(newAppDeveloperUrl, "Developer website")
      const redirectUrl = normalizeOptionalHttpUrl(newAppRedirectUrl, "Connect redirect URL")
      const result = await client.createApp(session, {
        name: cleanName,
        description: newAppDescription.trim(),
        developer_url: developerUrl,
        redirect_urls: redirectUrl ? [redirectUrl] : [],
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
    try {
      await client.grantConsent(session, {
        app_id: selectedAppId,
        scopes: normalizeSelectedScopes(selectedScopes, policy),
        categories: getSelectedAppCategories()
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
    const permissionCategories = getSelectedAppCategories()
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

  function getSelectedAppCategories() {
    const selectedApp = apps.find((app) => app.id === selectedAppId)
    const appCategories = selectedApp?.default_categories?.length ? selectedApp.default_categories : defaultCategoriesForPolicy(policy)
    return normalizeSelectedCategories(appCategories, policy)
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
    navigateToPage("access", { replace: true })
  }

  function navigateToDataTransparency(request) {
    navigateWithConnectParams(routeForPage("data"), request)
  }

  function navigateToConnect(request) {
    navigateWithConnectParams(routeForPage("connect"), request)
  }

  function navigateWithConnectParams(pathname, request) {
    const url = new URL(pathname, window.location.origin)
    if (request?.app_id) url.searchParams.set("app_id", request.app_id)
    if (request?.scopes?.length) url.searchParams.set("scopes", request.scopes.join(","))
    if (request?.categories?.length) url.searchParams.set("categories", request.categories.join(","))
    if (request?.redirect_uri) url.searchParams.set("redirect_uri", request.redirect_uri)
    if (request?.state) url.searchParams.set("state", request.state)
    window.history.pushState({}, "", `${url.pathname}${url.search}`)
    const page = pageFromLocation(window.location)
    setCurrentPage(page)
    setActiveTab(page)
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
    setDisplayNameDraft("")
    setDisplayNameSuccess("")
    setAuthMode("sign-up")
    setStatus("Signed out.")
    navigateToPage("home", { replace: true })
  }

  const scopes = policy?.scopes || {}
  const showAuth = !session
  const statusNeedsAttention = /missing|failed|offline/i.test(status)
  const showStatusPill = !showAuth && Boolean(error || statusNeedsAttention)

  return (
    <main className={showAuth ? "page page-auth" : "page"}>
      <header className="topbar">
        <a className="logo-link" href="https://www.memact.com/" aria-label="Go to memact.com">
          <img className="logo-img" src="/logo.png" alt="Memact" />
        </a>
        {session ? (
          <nav className="tabs" aria-label="Memact portal tabs">
            <button type="button" className={currentPage === "access" ? "tab is-active" : "tab"} onClick={() => navigateToPage("access")}>Access</button>
            <button type="button" className={currentPage === "account" ? "tab is-active" : "tab"} onClick={() => navigateToPage("account")}>Account</button>
            <button type="button" className={currentPage === "help" ? "tab is-active" : "tab"} onClick={() => navigateToPage("help")}>Help</button>
          </nav>
        ) : null}
        {showStatusPill ? <span className="status-pill" aria-live="polite">{status}</span> : null}
      </header>

      {error ? <p id="error-message" className="notice notice-danger" role="alert">{error} {canRetryDashboard ? <button type="button" className="inline-retry" onClick={handleRetryDashboard}>Retry</button> : null}</p> : null}
      {authChecking && !showAuth ? <p className="status-line">Checking login.</p> : null}

      {currentPage === "help" ? (
        <section className="dashboard">
          <HelpPanel />
        </section>
      ) : session && currentPage === "connect" ? (
        <ConnectPage
          connectRequest={connectRequest}
          connectDetails={connectDetails}
          loading={connectLoading}
          notice={connectNotice}
          onApprove={handleConnectApprove}
          onCancel={handleConnectCancel}
          onLearnMore={() => navigateToPage("help")}
          onDataTransparency={() => navigateToDataTransparency(connectRequest)}
        />
      ) : session && currentPage === "data" && connectRequest?.app_id && connectDetails?.app ? (
        <DataTransparencyPage
          app={connectDetails?.app}
          scopes={connectDetails?.scopes || scopes}
          categories={connectDetails?.activity_categories || policy?.activity_categories || {}}
          requestedScopes={connectDetails?.requested_scopes || connectRequest?.scopes || []}
          requestedCategories={connectDetails?.requested_categories || connectRequest?.categories || []}
          transparency={connectDetails?.transparency || connectDetails?.data_transparency || connectDetails?.app?.transparency || {}}
          onBackToConsent={() => navigateToConnect(connectRequest)}
          onManageConsent={() => navigateToPage("access")}
        />
      ) : session && currentPage === "data" ? (
        <section className="connect-shell">
          <article className="panel connect-card">
            <p className="eyebrow">Data transparency</p>
            <h1>{connectRequest?.app_id && connectLoading === "loading" ? "Loading app transparency." : "Open this from an app consent link."}</h1>
            <p className="muted">
              {connectRequest?.app_id && connectLoading === "loading"
                ? "Checking the Memact app request before showing any data disclosure."
                : "This page only works with a real Memact app request. Use the Data Transparency link beside that app's consent screen."}
            </p>
            <div className="connect-actions">
              <button type="button" onClick={() => navigateToPage("access")}>Open dashboard</button>
              <button type="button" className="ghost" onClick={() => navigateToPage("help")}>Learn more</button>
            </div>
          </article>
        </section>
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
          displayName={getDisplayName(user, authUser)}
          displayNameDraft={displayNameDraft}
          setDisplayNameDraft={setDisplayNameDraft}
          displayNameSuccess={displayNameSuccess}
          onUpdateDisplayName={handleUpdateDisplayName}
        />
      ) : (
        <Landing
          isConnecting={Boolean(connectRequest?.app_id && isConnectPath())}
          showAuth={showAuth}
          email={email}
          password={password}
          passwordConfirm={passwordConfirm}
          authMode={authMode}
          authLoading={authLoading}
          authNotice={authNotice}
          setEmail={setEmail}
          setPassword={setPassword}
          setPasswordConfirm={setPasswordConfirm}
          setAuthMode={setLandingAuthMode}
          onEmailSignup={handleEmailSignup}
          onEmailLogin={handleEmailLogin}
          onPasswordLogin={handlePasswordLogin}
          onForgotPassword={handleForgotPassword}
          onGithubLogin={handleGithubLogin}
          onLearnMore={() => navigateToPage("help")}
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



function formatAuthErrorMessage(error, fallback = "Login did not finish.") {
  const baseMessage = String(error?.message || "").trim()
  if (/invalid login credentials/i.test(baseMessage)) {
    return "Email or password did not match. You can use the email link if this is your first login."
  }
  if (/email not confirmed/i.test(baseMessage)) {
    return "Confirm your email first, then sign in again."
  }
  const code = String(error?.code || "").trim()
  const status = Number.isFinite(error?.status) ? `status ${error.status}` : ""
  const details = String(error?.details || error?.hint || "").trim()
  const suffix = [code, status, details].filter(Boolean).join(" - ")
  if (baseMessage && suffix) return `${baseMessage} (${suffix})`
  if (baseMessage) return baseMessage
  return suffix || fallback
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
  return formatAuthErrorMessage(error, "Password login did not finish.")
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

function authModeFromLocation() {
  if (typeof window === "undefined") return "sign-up"
  return String(window.location.hash || "").toLowerCase().includes("sign-in") ? "sign-in" : "sign-up"
}

function shouldCheckSessionOnLoad() {
  if (typeof window === "undefined") return false
  const page = pageFromLocation(window.location)
  const authPayload = `${window.location.search || ""}${window.location.hash || ""}`.toLowerCase()
  return isProtectedPage(page) ||
    authPayload.includes("code=") ||
    authPayload.includes("access_token=") ||
    authPayload.includes("type=recovery") ||
    authPayload.includes("type=magiclink")
}

async function resolveInitialSession(authClient) {
  const authCode = getAuthCodeFromUrl()
  if (authCode && typeof authClient?.auth?.exchangeCodeForSession === "function") {
    try {
      const exchanged = await withAuthTimeout(authClient.auth.exchangeCodeForSession(authCode), AUTH_CODE_EXCHANGE_TIMEOUT_MS)
      if (exchanged?.data?.session || exchanged?.error) {
        return exchanged
      }
    } catch (exchangeError) {
      const fallback = await withAuthTimeout(authClient.auth.getSession(), AUTH_SESSION_CHECK_TIMEOUT_MS)
      if (fallback?.data?.session) return fallback
      return { data: { session: null }, error: exchangeError }
    }
  }

  return withAuthTimeout(authClient.auth.getSession(), AUTH_SESSION_CHECK_TIMEOUT_MS)
}

function getAuthCodeFromUrl() {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search || "").get("code") || ""
}

function withAuthTimeout(promise, timeoutMs) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("Login callback took too long.")), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId)
  })
}

function markPasswordReadyInBackground(auth, user, setAuthUser) {
  if (!user || user.user_metadata?.memact_password_ready) return
  auth.auth.updateUser({
    data: {
      ...user.user_metadata,
      memact_password_ready: true,
      memact_password_updated_at: new Date().toISOString()
    }
  })
    .then(({ data }) => {
      if (data?.user) {
        setAuthUser(data.user)
      }
    })
    .catch(() => {})
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
    redirect_uri: sanitizeConnectRedirectParam(params.get("redirect_uri") || ""),
    state: String(params.get("state") || "").slice(0, 300)
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
  return getAuthRedirectUrl(routeForPage("access"))
}

function buildConnectRedirect(redirectUri, values) {
  try {
    const url = new URL(redirectUri)
    if (!isSafeHttpUrl(url)) return routeForPage("access")
    Object.entries(values || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value)
      }
    })
    return url.toString()
  } catch {
    return routeForPage("access")
  }
}

function normalizeOptionalHttpUrl(value, label) {
  const trimmed = String(value || "").trim()
  if (!trimmed) return ""
  try {
    const url = new URL(trimmed)
    if (!isSafeHttpUrl(url)) {
      throw new Error(`${label} must start with http:// or https://.`)
    }
    return url.toString()
  } catch (error) {
    if (error?.message?.includes("http://")) throw error
    throw new Error(`${label} must be a valid http:// or https:// URL.`)
  }
}

function sanitizeConnectRedirectParam(value) {
  const trimmed = String(value || "").trim()
  if (!trimmed) return ""
  try {
    const url = new URL(trimmed)
    return isSafeHttpUrl(url) ? url.toString() : ""
  } catch {
    return ""
  }
}

function isSafeHttpUrl(url) {
  return url?.protocol === "https:" || url?.protocol === "http:"
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
