import { AccessApiError } from "./legacy-access-http-client.js"

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
    if (error) {
      throw new AccessApiError(401, error.message, "invalid_session", error)
    }
    if (!data?.user) {
      throw new AccessApiError(401, "Session is missing or expired.", "invalid_session")
    }
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
    return this.rpc("memact_create_app", {
      app_name: body?.name || "",
      app_description: body?.description || "",
      app_redirect_urls: body?.redirect_urls || []
    })
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
      if (!isLegacyApiKeyEntropyError(error)) {
        throw error
      }
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
    return this.rpc("memact_grant_consent", {
      app_id_input: body?.app_id,
      scopes_input: body?.scopes || []
    })
  }

  async verifyApiKey(apiKey, requiredScopes = []) {
    const result = await this.rpc("memact_verify_api_key", {
      api_key_input: apiKey,
      required_scopes_input: requiredScopes
    })
    if (!result?.allowed) {
      throw new AccessApiError(403, result?.error?.message || "Access denied.", result?.error?.code || "scope_denied", result)
    }
    return result
  }

  async rpc(name, params = {}) {
    const { data, error } = await this.supabase.rpc(name, params)
    if (error) {
      throw mapSupabaseRpcError(error)
    }
    return data && typeof data === "object" ? data : {}
  }

  async createApiKeyFallback(body) {
    const { data: userData, error: userError } = await this.supabase.auth.getUser()
    if (userError) {
      throw mapSupabaseRpcError(userError)
    }
    const user = userData?.user
    if (!user?.id) {
      throw new AccessApiError(401, "Please sign in again.", "invalid_session")
    }

    const { data: app, error: appError } = await this.supabase
      .from("memact_apps")
      .select("id")
      .eq("id", body?.app_id)
      .eq("owner_user_id", user.id)
      .is("revoked_at", null)
      .maybeSingle()

    if (appError) {
      throw new AccessApiError(500, appError.message || "Could not check the selected app.", "app_lookup_failed", appError)
    }
    if (!app?.id) {
      throw new AccessApiError(404, "App not found.", "app_not_found")
    }

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

    if (createError) {
      throw new AccessApiError(500, createError.message || "Could not create the API key.", "api_key_insert_failed", createError)
    }

    return {
      api_key: createdKey,
      key: rawKey
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
  if (/gen_random_bytes\(integer\) does not exist/i.test(message)) {
    return new AccessApiError(500, "Memact is using an older API-key function. A browser-safe fallback will be used.", "legacy_api_key_entropy", error)
  }
  return new AccessApiError(500, message || "Supabase Access request failed.", error?.code || "rpc_failed", error)
}

function isLegacyApiKeyEntropyError(error) {
  return error instanceof AccessApiError && error.code === "legacy_api_key_entropy"
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
