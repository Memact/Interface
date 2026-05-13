export const HOME_ROUTE = "/"
export const ACCESS_ROUTE = "/Access"
export const ACCOUNT_ROUTE = "/Account"
export const HELP_ROUTE = "/Help"
export const CONNECT_ROUTE = "/connect"

const LEGACY_ROUTE_REDIRECTS = new Map([
  ["/dashboard", ACCESS_ROUTE],
  ["/login", HOME_ROUTE]
])

const CANONICAL_ROUTE_REDIRECTS = new Map([
  [HOME_ROUTE.toLowerCase(), HOME_ROUTE],
  [ACCESS_ROUTE.toLowerCase(), ACCESS_ROUTE],
  [ACCOUNT_ROUTE.toLowerCase(), ACCOUNT_ROUTE],
  [HELP_ROUTE.toLowerCase(), HELP_ROUTE],
  [CONNECT_ROUTE.toLowerCase(), CONNECT_ROUTE]
])

const KNOWN_PORTAL_ROUTES = new Set([
  HOME_ROUTE,
  ACCESS_ROUTE,
  ACCOUNT_ROUTE,
  HELP_ROUTE,
  CONNECT_ROUTE
])

export function normalizePortalPathname(rawPathname) {
  if (!rawPathname || rawPathname === HOME_ROUTE) return HOME_ROUTE

  const pathname = rawPathname.startsWith("/") ? rawPathname : `/${rawPathname}`
  if (LEGACY_ROUTE_REDIRECTS.has(pathname)) return LEGACY_ROUTE_REDIRECTS.get(pathname)

  const canonical = CANONICAL_ROUTE_REDIRECTS.get(pathname.toLowerCase())
  return canonical || pathname
}

export function isKnownPortalPath(pathname) {
  return KNOWN_PORTAL_ROUTES.has(normalizePortalPathname(pathname))
}

export function requiresPortalAuth(pathname) {
  const normalizedPath = normalizePortalPathname(pathname)
  return normalizedPath === ACCESS_ROUTE || normalizedPath === ACCOUNT_ROUTE
}

export function isConnectPortalPath(pathname) {
  return normalizePortalPathname(pathname) === CONNECT_ROUTE
}

export function getDefaultSignedInRoute({ openAccount = false } = {}) {
  return openAccount ? ACCOUNT_ROUTE : ACCESS_ROUTE
}

export function getPortalTab(pathname, hasSession) {
  const normalizedPath = normalizePortalPathname(pathname)
  if (normalizedPath === ACCOUNT_ROUTE) return "account"
  if (normalizedPath === HELP_ROUTE) return "help"
  if (normalizedPath === CONNECT_ROUTE) return "connect"
  if (normalizedPath === ACCESS_ROUTE) return "access"
  return hasSession ? "access" : "login"
}

export function getPortalTitle(pathname, hasSession) {
  const tab = getPortalTab(pathname, hasSession)
  if (tab === "account") return "Account"
  if (tab === "help") return "Help"
  if (tab === "connect") return "Connect"
  if (tab === "access") return "API Keys"
  return "Login"
}
