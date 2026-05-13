import assert from "node:assert/strict"
import test from "node:test"
import {
  ACCESS_ROUTE,
  ACCOUNT_ROUTE,
  CONNECT_ROUTE,
  HELP_ROUTE,
  HOME_ROUTE,
  getDefaultSignedInRoute,
  getPortalTab,
  normalizePortalPathname,
  requiresPortalAuth
} from "../portal-routes.js"

test("normalizePortalPathname keeps canonical routes stable", () => {
  assert.equal(normalizePortalPathname("/dashboard"), ACCESS_ROUTE)
  assert.equal(normalizePortalPathname("/login"), HOME_ROUTE)
  assert.equal(normalizePortalPathname("/access"), ACCESS_ROUTE)
  assert.equal(normalizePortalPathname("/account"), ACCOUNT_ROUTE)
  assert.equal(normalizePortalPathname("/help"), HELP_ROUTE)
  assert.equal(normalizePortalPathname("/connect"), CONNECT_ROUTE)
})

test("requiresPortalAuth only gates account routes", () => {
  assert.equal(requiresPortalAuth(ACCESS_ROUTE), true)
  assert.equal(requiresPortalAuth(ACCOUNT_ROUTE), true)
  assert.equal(requiresPortalAuth(HELP_ROUTE), false)
  assert.equal(requiresPortalAuth(CONNECT_ROUTE), false)
})

test("getPortalTab follows the current pathname", () => {
  assert.equal(getPortalTab(ACCESS_ROUTE, true), "access")
  assert.equal(getPortalTab(ACCOUNT_ROUTE, true), "account")
  assert.equal(getPortalTab(HELP_ROUTE, false), "help")
  assert.equal(getPortalTab(HOME_ROUTE, false), "login")
})

test("getDefaultSignedInRoute opens account only when requested", () => {
  assert.equal(getDefaultSignedInRoute(), ACCESS_ROUTE)
  assert.equal(getDefaultSignedInRoute({ openAccount: true }), ACCOUNT_ROUTE)
})
