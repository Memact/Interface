import assert from "node:assert/strict"
import test from "node:test"
import { dashboardReducer, initialDashboardState } from "../hooks/useDashboardState.js"

test("dashboard reducer stores synced dashboard data", () => {
  const next = dashboardReducer(initialDashboardState, {
    type: "synced",
    user: { email: "user@example.com" },
    apps: [{ id: "app_1" }],
    apiKeys: [{ id: "key_1" }],
    consents: [{ id: "consent_1" }]
  })

  assert.equal(next.user.email, "user@example.com")
  assert.equal(next.apps.length, 1)
  assert.equal(next.apiKeys.length, 1)
  assert.equal(next.consents.length, 1)
  assert.equal(next.error, "")
  assert.equal(next.status, "Dashboard synced.")
  assert.equal(next.canRetryDashboard, false)
})

test("dashboard reducer records recoverable sync failures", () => {
  const next = dashboardReducer(initialDashboardState, {
    type: "failed",
    message: "Supabase Access needs the SQL migration.",
    status: "Dashboard sync failed."
  })

  assert.equal(next.error, "Supabase Access needs the SQL migration.")
  assert.equal(next.status, "Dashboard sync failed.")
  assert.equal(next.canRetryDashboard, true)
})

test("dashboard reducer clears dashboard data without changing status", () => {
  const synced = dashboardReducer(initialDashboardState, {
    type: "synced",
    user: { email: "user@example.com" },
    apps: [{ id: "app_1" }],
    apiKeys: [{ id: "key_1" }],
    consents: [{ id: "consent_1" }]
  })
  const next = dashboardReducer(synced, { type: "reset-data" })

  assert.equal(next.user, null)
  assert.deepEqual(next.apps, [])
  assert.deepEqual(next.apiKeys, [])
  assert.deepEqual(next.consents, [])
  assert.equal(next.status, "Dashboard synced.")
})
