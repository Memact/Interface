import { AccessApiError } from "./legacy-access-http-client.js"

import { normalizeAppName } from "./app-name.js"

export class SupabaseAccessClient {
  constructor(supabase) {
    this.supabase = supabase
  }

  async health() {
    await this.policy()
    return { ok: true, service: "memact-access-supabase", version: "v0.0" }
  }

  async policy() {
    return this.rpc("memact_policy")
  }

  async me() {
    const { data, error } = await this.supabase.auth.getUser()
    if (error) throw new AccessApiError(401, error.message, "invalid_session", error)
    if (!data?.user) throw new AccessApiError(401, "Session is missing or expired.", "invalid_session")
    return {
      user: {
        id: data.user.id,
        email: data.user.email || "",
        provider: data.user.app_metadata?.provider || data.user.identities?.[0]?.provider || "email",
        avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || "",
        plan: "free_unlimited",
        created_at: data.user.created_at || null
      }
    }
  }

  async dashboard() {
    return this.rpc("memact_dashboard")
  }

  async apps() {
    const dashboard = await this.dashboard()
    return { apps: dashboard.apps || [] }
  }

  async createApp(_session, body) {
    try {
      return await this.rpc("memact_create_app", {
        app_name: body?.name || "",
        app_description: body?.description || "",
        app_redirect_urls: body?.redirect_urls || [],
        app_developer_url: body?.developer_url || "",
        app_categories: body?.categories || []
      })
    } catch (error) {
      if (!isLegacyCreateAppRpcError(error)) throw error
      return this.createAppFallback(body)
    }
  }

  async deleteApp(_session, appId) {
    return this.rpc("memact_delete_app", { app_id_input: appId })
  }

  async apiKeys() {
    const dashboard = await this.dashboard()
    return { api_keys: dashboard.api_keys || [] }
  }

  async createApiKey(_session, body) {
    try {
      return await this.rpc("memact_create_api_key", {
        app_id_input: body?.app_id,
        key_name_input: body?.name || "Default app key",
        scopes_input: body?.scopes || []
      })
    } catch (error) {
      if (!isLegacyApiKeyEntropyError(error)) throw error
      return this.createApiKeyFallback(body)
    }
  }

  async revokeApiKey(_session, keyId) {
    return this.rpc("memact_revoke_api_key", { key_id_input: keyId })
  }

  async consents() {
    const dashboard = await this.dashboard()
    return { consents: dashboard.consents || [] }
  }

  async grantConsent(_session, body) {
    try {
      return await this.rpc("memact_grant_consent", {
        app_id_input: body?.app_id,
        scopes_input: body?.scopes || [],
        categories_input: body?.categories || []
      })
    } catch (error) {
      if (!isLegacyGrantConsentRpcError(error)) throw error
      return this.grantConsentFallback(body)
    }
  }

  async getConnectApp(_session, request = {}) {
    return this.rpc("memact_get_connect_app", {
      app_id_input: request?.app_id,
      scopes_input: request?.scopes || [],
      categories_input: request?.categories || []
    })
  }

  async connectApp(_session, request = {}) {
    try {
      return await this.rpc("memact_connect_app", {
        app_id_input: request?.app_id,
        scopes_input: request?.scopes || [],
        categories_input: request?.categories || []
      })
    } catch (error) {
      if (!isLegacyConnectAppRpcError(error)) throw error
      const granted = await this.grantConsentFallback({
        app_id: request?.app_id,
        scopes: request?.scopes || [],
        categories: request?.categories || []
      })
      return { ...granted, connected: true }
    }
  }

  async verifyApiKey(apiKey, requiredScopes = [], requiredCategories = [], connectionId = null) {
    let result
    try {
      result = await this.rpc("memact_verify_api_key", {
        api_key_input: apiKey,
        required_scopes_input: requiredScopes,
        activity_categories_input: requiredCategories,
        consent_id_input: connectionId || null
      })
    } catch (error) {
      if (!isLegacyAccessCryptoError(error)) throw error
      result = await this.verifyApiKeyFallback(apiKey, requiredScopes, requiredCategories, connectionId)
    }
    if (!result?.allowed) {
      throw new AccessApiError(403, result?.error?.message || "Access denied.", result?.error?.code || "scope_denied", result)
    }
    return result
  }

  async rpc(name, params = {}) {
    const { data, error } = await this.supabase.rpc(name, params)
    if (error) throw mapSupabaseRpcError(error)
    return data && typeof data === "object" ? data : {}
  }

  async createApiKeyFallback(body) {
    const { data: userData, error: userError } = await this.supabase.auth.getUser()
    if (userError) throw mapSupabaseRpcError(userError)
    const user = userData?.user
    if (!user?.id) throw new AccessApiError(401, "Please sign in again.", "invalid_session")

    const { data: app, error: appError } = await this.supabase
      .from("memact_apps")
      .select("id")
      .eq("id", body?.app_id)
      .eq("owner_user_id", user.id)
      .is("revoked_at", null)
      .maybeSingle()

    if (appError) throw new AccessApiError(500, appError.message || "Could not check the selected app.", "app_lookup_failed", appError)
    if (!app?.id) throw new AccessApiError(404, "App not found.", "app_not_found")

    const rawKey = createBrowserApiKey()
    const keyHash = await sha256Hex(rawKey)
    const payload = {
      app_id: app.id,
      owner_user_id: user.id,
      name: (body?.name || "Default app key").trim().slice(0, 80) || "Default app key",
      key_hash: keyHash,
      key_prefix: rawKey.slice(0, 12),
      scopes: Array.isArray(body?.scopes) ? body.scopes : []
    }

    const { data: createdKey, error: createError } = await this.supabase
      .from("memact_api_keys")
      .insert(payload)
      .select("id, app_id, owner_user_id, name, key_prefix, scopes, created_at, last_used_at, revoked_at")
      .single()

    if (createError) throw new AccessApiError(500, createError.message || "Could not create the API key.", "api_key_insert_failed", createError)
    return { api_key: createdKey, key: rawKey }
  }

  async createAppFallback(body) {
    const { data: userData, error: userError } = await this.supabase.auth.getUser()
    if (userError) throw mapSupabaseRpcError(userError)
    const user = userData?.user
    if (!user?.id) throw new AccessApiError(401, "Please sign in again.", "invalid_session")

    const cleanedName = String(body?.name || "").trim().slice(0, 80)
    const slug = normalizeAppName(cleanedName)
    if (cleanedName.length < 2) throw new AccessApiError(400, "App name must be at least 2 characters.", "invalid_app_name")
    if (!slug) throw new AccessApiError(400, "App name needs letters or numbers.", "invalid_app_name")

    const { data: existingApp, error: duplicateError } = await this.supabase
      .from("memact_apps")
      .select("id")
      .eq("owner_user_id", user.id)
      .eq("slug", slug)
      .is("revoked_at", null)
      .maybeSingle()

    if (duplicateError) throw new AccessApiError(500, duplicateError.message || "Could not check existing apps.", "app_lookup_failed", duplicateError)
    if (existingApp?.id) throw new AccessApiError(409, "You already have an app with this name.", "duplicate_app_name")

    const payload = {
      owner_user_id: user.id,
      name: cleanedName,
      slug,
      description: String(body?.description || "").trim().slice(0, 240),
      developer_url: String(body?.developer_url || "").trim().slice(0, 300),
      redirect_urls: Array.isArray(body?.redirect_urls) ? body.redirect_urls : [],
      default_categories: Array.isArray(body?.categories) ? body.categories : []
    }

    const { data: createdApp, error: createError } = await this.supabase
      .from("memact_apps")
      .insert(payload)
      .select("id, owner_user_id, name, slug, description, developer_url, redirect_urls, default_scopes, default_categories, created_at, revoked_at")
      .single()

    if (createError) throw new AccessApiError(500, createError.message || "Could not create the app.", "app_insert_failed", createError)
    return { app: createdApp }
  }

  async grantConsentFallback(body) {
    const { data: userData, error: userError } = await this.supabase.auth.getUser()
    if (userError) throw mapSupabaseRpcError(userError)
    const user = userData?.user
    if (!user?.id) throw new AccessApiError(401, "Please sign in again.", "invalid_session")

    const { data: app, error: appError } = await this.supabase
      .from("memact_apps")
      .select("id, owner_user_id, default_scopes, default_categories, revoked_at")
      .eq("id", body?.app_id)
      .eq("owner_user_id", user.id)
      .is("revoked_at", null)
      .maybeSingle()

    if (appError) throw new AccessApiError(500, appError.message || "Could not check the selected app.", "app_lookup_failed", appError)
    if (!app?.id) throw new AccessApiError(404, "App not found.", "app_not_found")

    const scopes = filterKnownValues(body?.scopes, app.default_scopes)
    const categories = filterKnownValues(body?.categories, app.default_categories)
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

  async verifyApiKeyFallback(apiKey, requiredScopes = [], requiredCategories = [], connectionId = null) {
    const keyHash = await sha256Hex(apiKey || "")
    const { data: key, error: keyError } = await this.supabase
      .from("memact_api_keys")
      .select("id, app_id, owner_user_id, name, key_prefix, scopes, created_at, last_used_at, revoked_at")
      .eq("key_hash", keyHash)
      .is("revoked_at", null)
      .maybeSingle()

    if (keyError) throw new AccessApiError(500, keyError.message || "Could not verify the API key.", "api_key_lookup_failed", keyError)
    if (!key?.id) return denied("invalid_api_key", "API key is invalid or revoked.")

    const { data: app, error: appError } = await this.supabase
      .from("memact_apps")
      .select("id, name, slug, description, developer_url, owner_user_id, revoked_at")
      .eq("id", key.app_id)
      .is("revoked_at", null)
      .maybeSingle()

    if (appError) throw new AccessApiError(500, appError.message || "Could not verify the app.", "app_lookup_failed", appError)
    if (!app?.id) return denied("app_revoked", "App is missing or revoked.")

    let consentQuery = this.supabase
      .from("memact_consents")
      .select("id, user_id, scopes, categories, revoked_at")
      .eq("app_id", key.app_id)
      .is("revoked_at", null)

    consentQuery = connectionId ? consentQuery.eq("id", connectionId) : consentQuery.eq("user_id", key.owner_user_id)
    const { data: consent, error: consentError } = await consentQuery.maybeSingle()

    if (consentError) throw new AccessApiError(500, consentError.message || "Could not verify permissions.", "consent_lookup_failed", consentError)
    if (!consent?.id) return denied("consent_missing", "User permissions are missing for this app.")

    const keyScopes = Array.isArray(key.scopes) ? key.scopes : []
    const consentScopes = Array.isArray(consent.scopes) ? consent.scopes : []
    const effectiveScopes = keyScopes.filter((scope) => consentScopes.includes(scope))
    const consentCategories = Array.isArray(consent.categories) ? consent.categories : []
    const effectiveCategories = consentCategories
    const missingScopes = requiredScopes.filter((scope) => !effectiveScopes.includes(scope))
    const missingCategories = requiredCategories.filter((category) => !effectiveCategories.includes(category))

    if (missingScopes.length || missingCategories.length) {
      return {
        allowed: false,
        app,
        key: { id: key.id, key_prefix: key.key_prefix, scopes: keyScopes },
        scopes: effectiveScopes,
        categories: effectiveCategories,
        missing_scopes: missingScopes,
        missing_categories: missingCategories,
        error: {
          code: "scope_or_category_denied",
          message: "API key or user permissions do not include the requested scopes or categories."
        }
      }
    }

    return {
      allowed: true,
      app,
      user_id: consent.user_id,
      connection_id: consent.id,
      key: { id: key.id, key_prefix: key.key_prefix, scopes: keyScopes },
      scopes: effectiveScopes,
      categories: effectiveCategories,
      missing_scopes: [],
      missing_categories: []
    }
  }
}

function mapSupabaseRpcError(error) {
  const message = String(error?.message || "")
  if (/Please sign in again/i.test(message) || /JWT|session|expired/i.test(message)) {
    return new AccessApiError(401, "Please sign in again.", "invalid_session", error)
  }
  if (/already have an app with this name/i.test(message)) {
    return new AccessApiError(409, "You already have an app with this name.", "duplicate_app_name", error)
  }
  if (/App not found/i.test(message)) {
    return new AccessApiError(404, "App not found.", "app_not_found", error)
  }
  if (/API key not found/i.test(message)) {
    return new AccessApiError(404, "API key not found.", "api_key_not_found", error)
  }
  if (/could not choose the best candidate function.*memact_create_app|memact_create_app.*app_redirect_urls.*text\[\]/i.test(message)) {
    return new AccessApiError(500, "Memact found an older Access app function. Using the browser-safe app creation path.", "legacy_create_app_rpc", error)
  }
  if (/could not find the function.*memact_grant_consent|memact_grant_consent.*schema cache/i.test(message)) {
    return new AccessApiError(500, "Memact found an older Access permission function. Using the browser-safe permission save path.", "legacy_grant_consent_rpc", error)
  }
  if (/could not find the function.*memact_connect_app|memact_connect_app.*schema cache|connect_app.*categories/i.test(message)) {
    return new AccessApiError(500, "Memact found an older Access connection function. Using the browser-safe connection path.", "legacy_connect_app_rpc", error)
  }
  if (/could not find the function|schema cache|developer_url.*does not exist|categories.*does not exist/i.test(message)) {
    return new AccessApiError(500, "Access needs the latest Supabase SQL applied once, then refresh this page.", "access_migration_required", error)
  }
  if (/gen_random_bytes\(integer\) does not exist|digest\(text,\s*unknown\) does not exist/i.test(message)) {
    return new AccessApiError(500, "Memact is using an older Access crypto function. A browser-safe fallback will be used.", "legacy_access_crypto", error)
  }
  return new AccessApiError(500, message || "Supabase Access request failed.", error?.code || "rpc_failed", error)
}

function isLegacyApiKeyEntropyError(error) {
  return isLegacyAccessCryptoError(error)
}

function isLegacyCreateAppRpcError(error) {
  return error instanceof AccessApiError && error.code === "legacy_create_app_rpc"
}

function isLegacyGrantConsentRpcError(error) {
  return error instanceof AccessApiError && error.code === "legacy_grant_consent_rpc"
}

function isLegacyConnectAppRpcError(error) {
  return error instanceof AccessApiError && error.code === "legacy_connect_app_rpc"
}

function isLegacyAccessCryptoError(error) {
  return error instanceof AccessApiError && error.code === "legacy_access_crypto"
}

function filterKnownValues(values, allowedValues) {
  const requested = Array.isArray(values) ? [...new Set(values)] : []
  const allowed = Array.isArray(allowedValues) ? allowedValues : []
  return requested.filter((value) => allowed.includes(value))
}

function denied(code, message) {
  return {
    allowed: false,
    scopes: [],
    categories: [],
    missing_scopes: [],
    missing_categories: [],
    error: { code, message }
  }
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
