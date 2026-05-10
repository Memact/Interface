export function getUserEmail(accessUser, authUser) {
  return accessUser?.email || authUser?.email || ""
}

export function getUserProvider(accessUser, authUser) {
  return accessUser?.provider || authUser?.app_metadata?.provider || authUser?.identities?.[0]?.provider || "email"
}

export function getProviderLabel(provider) {
  const value = String(provider || "email").toLowerCase()
  if (value === "github") return "GitHub"
  if (value === "email") return "Email"
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Email"
}

export function getDisplayName(accessUser, authUser) {
  const provider = getUserProvider(accessUser, authUser)
  const email = getUserEmail(accessUser, authUser)
  const metadata = authUser?.user_metadata || {}
  const identityData = authUser?.identities?.[0]?.identity_data || {}
  const candidates = [
    accessUser?.display_name,
    metadata.memact_display_name,
    metadata.full_name,
    metadata.name,
    metadata.user_name,
    metadata.preferred_username,
    identityData.full_name,
    identityData.name,
    identityData.user_name,
    identityData.preferred_username
  ]

  const found = candidates
    .map((value) => String(value || "").trim())
    .find(Boolean)

  if (found) return found
  if (provider === "github" && email) return email.split("@")[0]
  return "Memact user"
}

export function getAvatarUrl(accessUser, authUser) {
  const metadata = authUser?.user_metadata || {}
  const identityData = authUser?.identities?.[0]?.identity_data || {}
  return accessUser?.avatar_url || metadata.avatar_url || metadata.picture || identityData.avatar_url || identityData.picture || ""
}

export function getInitials(displayName, email = "") {
  const value = String(displayName || email || "M").trim()
  const words = value.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }
  return value.slice(0, 1).toUpperCase()
}
