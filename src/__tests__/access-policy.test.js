import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SCOPES,
  defaultCategoriesForPolicy,
  defaultScopesForPolicy,
  normalizeSelectedCategories,
  normalizeSelectedScopes,
  permissionSuggestionForCategories
} from "../access-policy.js"

test("defaultScopesForPolicy keeps existing defaults when policy is unavailable", () => {
  assert.deepEqual(defaultScopesForPolicy(null), DEFAULT_SCOPES)
})

test("defaultScopesForPolicy filters defaults to scopes published by Access", () => {
  const policy = {
    scopes: {
      "capture:webpage": {},
      "memory:read_summary": {},
      "experimental:only": {}
    }
  }

  assert.deepEqual(defaultScopesForPolicy(policy), ["capture:webpage", "memory:read_summary"])
})

test("defaultScopesForPolicy falls back to Access scopes when no default is available", () => {
  const policy = {
    scopes: {
      "custom:read": {},
      "custom:write": {}
    }
  }

  assert.deepEqual(defaultScopesForPolicy(policy), ["custom:read", "custom:write"])
})

test("normalizeSelectedScopes removes duplicates and unknown policy scopes", () => {
  const policy = {
    scopes: {
      "capture:webpage": {},
      "memory:write": {}
    }
  }

  assert.deepEqual(
    normalizeSelectedScopes(["capture:webpage", "unknown:scope", "memory:write", "capture:webpage"], policy),
    ["capture:webpage", "memory:write"]
  )
})

test("defaultCategoriesForPolicy keeps category defaults when policy is unavailable", () => {
  assert.deepEqual(defaultCategoriesForPolicy(null), DEFAULT_CATEGORIES)
})

test("defaultCategoriesForPolicy respects Access category defaults", () => {
  const policy = {
    activity_categories: {
      "web:news": {},
      "ai:assistant": {},
      "work:docs": {}
    },
    default_app_categories: ["ai:assistant", "work:docs"]
  }

  assert.deepEqual(defaultCategoriesForPolicy(policy), ["ai:assistant", "work:docs"])
})

test("normalizeSelectedCategories removes duplicates and unknown categories", () => {
  const policy = {
    activity_categories: {
      "web:news": {},
      "ai:assistant": {}
    }
  }

  assert.deepEqual(
    normalizeSelectedCategories(["web:news", "unknown", "ai:assistant", "web:news"], policy),
    ["web:news", "ai:assistant"]
  )
})

test("permissionSuggestionForCategories creates category-specific selected scopes", () => {
  const policy = {
    scopes: {
      "capture:webpage": {},
      "capture:media": {},
      "schema:write": {},
      "graph:write": {},
      "memory:write": {},
      "memory:read_summary": {},
      "memory:read_evidence": {}
    },
    activity_categories: {
      "web:news": {},
      "media:video": {}
    }
  }

  const suggestion = permissionSuggestionForCategories(policy, ["web:news", "media:video"])

  assert.equal(suggestion.label, "Suggested for article understanding")
  assert.ok(suggestion.scopes.includes("capture:webpage"))
  assert.ok(suggestion.scopes.includes("capture:media"))
  assert.ok(suggestion.scopes.includes("memory:write"))
})
