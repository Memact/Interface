import assert from "node:assert/strict"
import test from "node:test"
import { getDisplayName, getInitials, getProviderLabel, getUserProvider } from "../user-display.js"

test("display name prefers explicit Memact metadata", () => {
  const authUser = {
    email: "sujay@example.com",
    app_metadata: { provider: "email" },
    user_metadata: {
      memact_display_name: "Sujay"
    }
  }

  assert.equal(getDisplayName(null, authUser), "Sujay")
})

test("GitHub display name falls through metadata before email prefix", () => {
  const authUser = {
    email: "keepsloading@example.com",
    app_metadata: { provider: "github" },
    user_metadata: {},
    identities: [
      {
        provider: "github",
        identity_data: {
          user_name: "Keeps Loading"
        }
      }
    ]
  }

  assert.equal(getUserProvider(null, authUser), "github")
  assert.equal(getProviderLabel("github"), "GitHub")
  assert.equal(getDisplayName(null, authUser), "Keeps Loading")
})

test("email users without a saved name get a friendly non-email heading", () => {
  const authUser = {
    email: "person@example.com",
    app_metadata: { provider: "email" },
    user_metadata: {}
  }

  assert.equal(getDisplayName(null, authUser), "Memact user")
  assert.equal(getInitials("Memact user", "person@example.com"), "MU")
})
