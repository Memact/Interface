import { createClient } from "@supabase/supabase-js"

const env = import.meta.env || {}
const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const authRedirectUrl = env.VITE_AUTH_REDIRECT_URL || env.NEXT_PUBLIC_AUTH_REDIRECT_URL || ""
const SESSION_CHECK_TIMEOUT_MS = 4000

export const SUPABASE_URL = supabaseUrl
export const SUPABASE_ANON_KEY = supabaseAnonKey
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    })
  : null

if (supabase?.auth?.getSession) {
  const getSession = supabase.auth.getSession.bind(supabase.auth)
  supabase.auth.getSession = async () => {
    try {
      const fallbackSession = getStoredSupabaseSession()
      return await withTimeout(
        Promise.resolve().then(() => getSession()),
        SESSION_CHECK_TIMEOUT_MS,
        { data: { session: fallbackSession }, error: null }
      )
    } catch (error) {
      return { data: { session: getStoredSupabaseSession() }, error }
    }
  }
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.")
  }
  return supabase
}

export function getAuthRedirectUrl(path = "/dashboard") {
  if (authRedirectUrl) return authRedirectUrl
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString()
  }
  return new URL(path, "https://www.memact.com").toString()
}

function withTimeout(promise, timeoutMs, fallbackValue) {
  const timeoutApi = globalThis?.setTimeout?.bind(globalThis)
  const clearTimeoutApi = globalThis?.clearTimeout?.bind(globalThis)
  if (!timeoutApi || !clearTimeoutApi) {
    return promise
  }

  let timeoutId
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = timeoutApi(() => resolve(fallbackValue), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeoutApi(timeoutId)
  })
}

function getStoredSupabaseSession() {
  try {
    if (typeof window === "undefined" || !window.localStorage || !supabaseUrl) {
      return null
    }

    const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
    const storageKey = `sb-${projectRef}-auth-token`
    const rawValue = window.localStorage.getItem(storageKey)
    if (!rawValue) return null

    const parsedValue = JSON.parse(rawValue)
    const session = parsedValue?.currentSession || parsedValue
    if (!session?.access_token || !session?.user) return null

    return session
  } catch {
    return null
  }
}
