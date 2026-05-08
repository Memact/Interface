import assert from "node:assert/strict"
import test from "node:test"
import { SupabaseAccessClient } from "../supabase-access-client.js"

test("createApp falls back when Supabase still has an overloaded legacy RPC", async () => {
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
