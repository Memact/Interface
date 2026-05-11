import { AccessApiError } from "./legacy-access-http-client.js"
import { SupabaseAccessClient } from "./supabase-access-client.js"

SupabaseAccessClient.prototype.createApiKeyFallback = async function createApiKeyFallback(body) {
  const user = await getCurrentUser(this.supabase)

  const { data: app, error: appError } = await this.supabase
    .from("memact_apps")
    .select("id, default_scopes")
    .eq("id", body?.app_id)
    .eq("owner_user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle()

  if (appError) throw new AccessApiError(500, appError.message || "Could not check the selected app.", "app_lookup_failed", appError)
  if (!app?.id) throw new AccessApiError(404, "App not found.", "app_not_found")

  const policy = await this.policy().catch(() => ({}))
  const policyScopes = Object.keys(policy?.scopes || {})
  const allowedScopes = policyScopes.length ? policyScopes : app.default_scopes
  const cleanScopes = filterKnownValues(body?.scopes, allowedScopes)
  if (!cleanScopes.length) throw new AccessApiError(400, "Select at least one permission.", "missing_scopes")

  const rawKey = createBrowserApiKey()
  const keyHash = await sha256Hex(rawKey)
  const payload = {
    app_id: app.id,
    owner_user_id: user.id,
    name: (body?.name || "Default app key").trim().slice(0, 80) || "Default app key",
    key_hash: keyHash,
    key_prefix: rawKey.slice(0, 12),
    scopes: cleanScopes
  }

  const { data: createdKey, error: createError } = await this.supabase
    .from("memact_api_keys")
    .insert(payload)
    .select("id, app_id, owner_user_id, name, key_prefix, scopes, created_at, last_used_at, revoked_at")
    .single()

  if (createError) throw new AccessApiError(500, createError.message || "Could not create the API key.", "api_key_insert_failed", createError)
  return { api_key: createdKey, key: rawKey }
}

SupabaseAccessClient.prototype.grantConsentFallback = async function grantConsentFallback(body, options = {}) {
  const requireOwner = options.requireOwner !== false
  const user = await getCurrentUser(this.supabase)

  let appQuery = this.supabase
    .from("memact_apps")
    .select("id, owner_user_id, default_scopes, default_categories, revoked_at")
    .eq("id", body?.app_id)
    .is("revoked_at", null)

  if (requireOwner) {
    appQuery = appQuery.eq("owner_user_id", user.id)
  }

  const { data: app, error: appError } = await appQuery.maybeSingle()
  if (appError) throw new AccessApiError(500, appError.message || "Could not check the selected app.", "app_lookup_failed", appError)
  if (!app?.id) throw new AccessApiError(404, "App not found.", "app_not_found")

  const policy = await this.policy().catch(() => ({}))
  const policyScopes = Object.keys(policy?.scopes || {})
  const policyCategories = Object.keys(policy?.activity_categories || {})
  const allowedScopes = policyScopes.length ? policyScopes : app.default_scopes
  const allowedCategories = policyCategories.length ? policyCategories : app.default_categories

  const scopes = filterKnownValues(body?.scopes, allowedScopes)
  const requestedCategories = Array.isArray(body?.categories) && body.categories.length ? body.categories : app.default_categories
  const categories = filterKnownValues(requestedCategories, allowedCategories)

  if (!scopes.length) throw new AccessApiError(400, "Select at least one permission.", "missing_scopes")
  if (!categories.length) throw new AccessApiError(400, "Select at least one activity category.", "missing_categories")

  const { data: existingConsent, error: consentLookupError } = await this.supabase
    .from("memact_consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("app_id", app.id)
    .is("revoked_at", null)
    .maybeSingle()

  if (consentLookupError) throw new AccessApiError(500, consentLookupError.message || "Could not check existing permissions.", "consent_lookup_failed", consentLookupError)

  const payload = {
    user_id: user.id,
    app_id: app.id,
    scopes,
    categories,
    updated_at: new Date().toISOString()
  }

  const query = existingConsent?.id
    ? this.supabase.from("memact_consents").update(payload).eq("id", existingConsent.id)
    : this.supabase.from("memact_consents").insert(payload)

  const { data: consent, error: writeError } = await query
    .select("id, user_id, app_id, scopes, categories, created_at, updated_at, revoked_at")
    .single()

  if (writeError) throw new AccessApiError(500, writeError.message || "Could not save permissions.", "consent_write_failed", writeError)
  return { consent }
}

async function getCurrentUser(supabase) {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new AccessApiError(401, error.message || "Please sign in again.", "invalid_session", error)
  if (!data?.user?.id) throw new AccessApiError(401, "Please sign in again.", "invalid_session")
  return data.user
}

function filterKnownValues(values, allowedValues) {
  const requested = Array.isArray(values) ? [...new Set(values)] : []
  const allowed = Array.isArray(allowedValues) ? allowedValues : []
  if (!allowed.length) return requested
  return requested.filter((value) => allowed.includes(value))
}

function createBrowserApiKey() {
  const bytes = new Uint8Array(24)
  globalThis.crypto.getRandomValues(bytes)
  return `mka_${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`
}

async function sha256Hex(value) {
  const buffer = new TextEncoder().encode(value)
  const hash = await globalThis.crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("")
}
