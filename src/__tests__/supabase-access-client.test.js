import assert from "node:assert/strict"
import test from "node:test"
import { SupabaseAccessClient } from "../supabase-access-client.js"

test("createApp uses browser-safe table writes instead of fragile overloaded RPCs", async () => {
  let insertedPayload = null
  const fakeSupabase = {
    rpc: async () => ({
      data: null,
      error: {
        message: "Could not choose the best candidate function between: public.memact_create_app(app_redirect_urls => text[]), public.memact_create_app(app_redirect_urls => jsonb)"
      }
    }),
    auth: {
      getUser: async () => ({ data: { user: { id: "user-123" } }, error: null })
    },
    from: () => ({
      select() {
        return this
      },
      eq() {
        return this
      },
      is() {
        return this
      },
      maybeSingle: async () => ({ data: null, error: null }),
      insert(payload) {
        insertedPayload = payload
        return {
          select() {
            return {
              single: async () => ({
                data: {
                  id: "app-123",
                  default_scopes: [],
                  created_at: null,
                  revoked_at: null,
                  ...payload
                },
                error: null
              })
            }
          }
        }
      }
    })
  }

  const client = new SupabaseAccessClient(fakeSupabase)
  const result = await client.createApp(null, {
    name: "My Memact App",
    description: "Useful memory app",
    developer_url: "https://example.com",
    redirect_urls: ["https://example.com/callback"],
    categories: ["web:news", "ai:assistant"]
  })

  assert.equal(result.app.id, "app-123")
  assert.equal(insertedPayload.owner_user_id, "user-123")
  assert.equal(insertedPayload.slug, "my-memact-app")
  assert.deepEqual(insertedPayload.default_categories, ["web:news", "ai:assistant"])
})

test("grantConsent saves app-level categories with browser-safe table writes", async () => {
  let insertedPayload = null
  const fakeSupabase = {
    rpc: async () => ({
      data: null,
      error: {
        message: "Could not find the function public.memact_grant_consent(app_id_input, categories_input, scopes_input) in the schema cache"
      }
    }),
    auth: {
      getUser: async () => ({ data: { user: { id: "user-123" } }, error: null })
    },
    from(table) {
      if (table === "memact_apps") {
        return {
          select() { return this },
          eq() { return this },
          is() { return this },
          maybeSingle: async () => ({
            data: {
              id: "app-123",
              owner_user_id: "user-123",
              default_scopes: ["capture:webpage", "memory:read_summary"],
              default_categories: ["web:news", "ai:assistant"],
              revoked_at: null
            },
            error: null
          })
        }
      }

      if (table === "memact_consents") {
        return {
          select() { return this },
          eq() { return this },
          is() { return this },
          maybeSingle: async () => ({ data: null, error: null }),
          insert(payload) {
            insertedPayload = payload
            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: "consent-123",
                      created_at: null,
                      revoked_at: null,
                      ...payload
                    },
                    error: null
                  })
                }
              }
            }
          }
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }
  }

  const client = new SupabaseAccessClient(fakeSupabase)
  const result = await client.grantConsent(null, {
    app_id: "app-123",
    scopes: ["capture:webpage", "unknown:scope"],
    categories: ["web:news", "unknown:category"]
  })

  assert.equal(result.consent.id, "consent-123")
  assert.equal(insertedPayload.user_id, "user-123")
  assert.deepEqual(insertedPayload.scopes, ["capture:webpage"])
  assert.deepEqual(insertedPayload.categories, ["web:news"])
})

test("createApiKey hashes the one-time key locally before storing it", async () => {
  let insertedPayload = null
  const fakeSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-123" } }, error: null })
    },
    from(table) {
      if (table === "memact_apps") {
        return {
          select() { return this },
          eq() { return this },
          is() { return this },
          maybeSingle: async () => ({
            data: {
              id: "app-123",
              default_scopes: ["capture:webpage", "schema:write"]
            },
            error: null
          })
        }
      }

      if (table === "memact_api_keys") {
        return {
          insert(payload) {
            insertedPayload = payload
            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: "key-123",
                      created_at: null,
                      revoked_at: null,
                      ...payload
                    },
                    error: null
                  })
                }
              }
            }
          }
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }
  }

  const client = new SupabaseAccessClient(fakeSupabase)
  const result = await client.createApiKey(null, {
    app_id: "app-123",
    name: "Default app key",
    scopes: ["capture:webpage", "unknown:scope"]
  })

  assert.match(result.key, /^mka_[a-f0-9]{48}$/)
  assert.equal(insertedPayload.owner_user_id, "user-123")
  assert.equal(insertedPayload.key_hash.length, 64)
  assert.notEqual(insertedPayload.key_hash, result.key)
  assert.deepEqual(insertedPayload.scopes, ["capture:webpage"])
})

test("connectApp falls back through durable consent when connect RPC is stale", async () => {
  let insertedPayload = null
  const fakeSupabase = {
    rpc: async () => ({
      data: null,
      error: {
        message: "Could not find the function public.memact_connect_app(app_id_input, categories_input, scopes_input) in the schema cache"
      }
    }),
    auth: {
      getUser: async () => ({ data: { user: { id: "user-123" } }, error: null })
    },
    from(table) {
      if (table === "memact_apps") {
        return {
          select() { return this },
          eq() { return this },
          is() { return this },
          maybeSingle: async () => ({
            data: {
              id: "app-123",
              owner_user_id: "user-123",
              default_scopes: ["capture:webpage", "schema:write"],
              default_categories: ["web:news", "web:research"],
              revoked_at: null
            },
            error: null
          })
        }
      }

      if (table === "memact_consents") {
        return {
          select() { return this },
          eq() { return this },
          is() { return this },
          maybeSingle: async () => ({ data: null, error: null }),
          insert(payload) {
            insertedPayload = payload
            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: "consent-456",
                      created_at: null,
                      revoked_at: null,
                      ...payload
                    },
                    error: null
                  })
                }
              }
            }
          }
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }
  }

  const client = new SupabaseAccessClient(fakeSupabase)
  const result = await client.connectApp(null, {
    app_id: "app-123",
    scopes: ["capture:webpage", "schema:write"],
    categories: ["web:research"]
  })

  assert.equal(result.connected, true)
  assert.equal(result.consent.id, "consent-456")
  assert.deepEqual(insertedPayload.scopes, ["capture:webpage", "schema:write"])
  assert.deepEqual(insertedPayload.categories, ["web:research"])
})

test("connectApp fallback lets a signed-in user approve an app they do not own", async () => {
  const appOwnerId = "developer-123"
  const connectingUserId = "user-456"
  let appOwnerFilterWasRequired = false
  const fakeSupabase = {
    rpc: async () => ({
      data: null,
      error: {
        message: "Could not find the function public.memact_connect_app(app_id_input, categories_input, scopes_input) in the schema cache"
      }
    }),
    auth: {
      getUser: async () => ({ data: { user: { id: connectingUserId } }, error: null })
    },
    from(table) {
      if (table === "memact_apps") {
        return {
          select() { return this },
          eq(column) {
            if (column === "owner_user_id") appOwnerFilterWasRequired = true
            return this
          },
          is() { return this },
          maybeSingle: async () => ({
            data: {
              id: "app-123",
              owner_user_id: appOwnerId,
              default_scopes: ["memory:read_summary"],
              default_categories: ["web:research"],
              revoked_at: null
            },
            error: null
          })
        }
      }

      if (table === "memact_consents") {
        return {
          select() { return this },
          eq() { return this },
          is() { return this },
          maybeSingle: async () => ({ data: null, error: null }),
          insert(payload) {
            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: "consent-789",
                      created_at: null,
                      revoked_at: null,
                      ...payload
                    },
                    error: null
                  })
                }
              }
            }
          }
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }
  }

  const client = new SupabaseAccessClient(fakeSupabase)
  const result = await client.connectApp(null, {
    app_id: "app-123",
    scopes: ["memory:read_summary"],
    categories: ["web:research"]
  })

  assert.equal(appOwnerFilterWasRequired, false)
  assert.equal(result.consent.user_id, connectingUserId)
  assert.equal(result.connected, true)
})
