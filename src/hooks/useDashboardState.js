import { useMemo, useReducer } from "react"

export const initialDashboardState = {
  user: null,
  apps: [],
  apiKeys: [],
  consents: [],
  status: "Checking Access.",
  error: "",
  canRetryDashboard: false
}

export const DASHBOARD_REFRESH_TIMEOUT_MS = 9000

export function dashboardReducer(state, action) {
  switch (action.type) {
    case "status":
      return { ...state, status: action.status }
    case "error":
      return { ...state, error: action.error }
    case "retry":
      return { ...state, canRetryDashboard: action.canRetryDashboard }
    case "synced":
      return {
        ...state,
        user: action.user,
        apps: action.apps,
        apiKeys: action.apiKeys,
        consents: action.consents,
        error: "",
        status: "Dashboard synced.",
        canRetryDashboard: false
      }
    case "failed":
      return {
        ...state,
        error: action.message,
        status: action.status,
        canRetryDashboard: true
      }
    case "reset-data":
      return {
        ...state,
        user: null,
        apps: [],
        apiKeys: [],
        consents: [],
        error: "",
        canRetryDashboard: false
      }
    default:
      return state
  }
}

export function useDashboardState() {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState)
  const actions = useMemo(() => ({
    setStatus(status) {
      dispatch({ type: "status", status })
    },
    setError(error) {
      dispatch({ type: "error", error })
    },
    setCanRetryDashboard(canRetryDashboard) {
      dispatch({ type: "retry", canRetryDashboard })
    },
    sync({ user, apps, apiKeys, consents }) {
      dispatch({ type: "synced", user, apps, apiKeys, consents })
    },
    fail({ message, status }) {
      dispatch({ type: "failed", message, status })
    },
    resetData() {
      dispatch({ type: "reset-data" })
    }
  }), [])

  return [state, actions]
}

export async function refreshDashboard(client, session, actions, getAccessStatus, options = {}) {
  actions.setCanRetryDashboard(false)
  try {
    const [me, dashboard] = await withTimeout(Promise.all([
      client.me(session),
      client.dashboard(session)
    ]), options.timeoutMs || DASHBOARD_REFRESH_TIMEOUT_MS)
    actions.sync({
      user: me.user,
      apps: dashboard.apps || [],
      apiKeys: dashboard.api_keys || [],
      consents: dashboard.consents || []
    })
  } catch (error) {
    actions.fail(getAccessStatus(error))
  }
}

function withTimeout(promise, timeoutMs) {
  let timeoutId
  const timeoutError = new Error("Dashboard sync took too long. Check the connection and try again.")
  timeoutError.code = "dashboard_sync_timeout"
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(timeoutError), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId)
  })
}
