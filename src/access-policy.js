export const DEFAULT_SCOPES = [
  "capture:webpage",
  "schema:write",
  "graph:write",
  "memory:write",
  "memory:read_summary"
]

export const DEFAULT_CATEGORIES = [
  "web:news",
  "web:research",
  "media:video",
  "ai:assistant",
  "dev:code"
]

export function availablePolicyScopes(policy) {
  return Object.keys(policy?.scopes || {})
}

export function availablePolicyCategories(policy) {
  return Object.keys(policy?.activity_categories || {})
}

export function defaultScopesForPolicy(policy) {
  const availableScopes = availablePolicyScopes(policy)
  if (!availableScopes.length) return DEFAULT_SCOPES

  const policyDefaults = DEFAULT_SCOPES.filter((scope) => availableScopes.includes(scope))
  return policyDefaults.length ? policyDefaults : availableScopes
}

export function defaultCategoriesForPolicy(policy) {
  const availableCategories = availablePolicyCategories(policy)
  if (!availableCategories.length) return DEFAULT_CATEGORIES

  const policyDefaults = (policy?.default_app_categories || DEFAULT_CATEGORIES)
    .filter((category) => availableCategories.includes(category))
  return policyDefaults.length ? policyDefaults : availableCategories
}

export function normalizeSelectedScopes(scopes, policy) {
  const selectedScopes = Array.isArray(scopes) ? scopes : []
  const dedupedScopes = [...new Set(selectedScopes)]
  const availableScopes = availablePolicyScopes(policy)
  if (!availableScopes.length) return dedupedScopes

  return dedupedScopes.filter((scope) => availableScopes.includes(scope))
}

export function normalizeSelectedCategories(categories, policy) {
  const selectedCategories = Array.isArray(categories) ? categories : []
  const dedupedCategories = [...new Set(selectedCategories)]
  const availableCategories = availablePolicyCategories(policy)
  if (!availableCategories.length) return dedupedCategories

  return dedupedCategories.filter((category) => availableCategories.includes(category))
}
