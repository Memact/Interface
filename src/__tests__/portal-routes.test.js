import assert from "node:assert/strict"
import test from "node:test"
import { isProtectedPage, normalizePortalPath, pageFromLocation, routeForPage } from "../portal-routes.js"

test("portal routes map clean URL pages", () => {
  assert.equal(pageFromLocation({ pathname: "/" }), "home")
  assert.equal(pageFromLocation({ pathname: "/Access" }), "access")
  assert.equal(pageFromLocation({ pathname: "/Account" }), "account")
  assert.equal(pageFromLocation({ pathname: "/Help" }), "help")
  assert.equal(pageFromLocation({ pathname: "/connect" }), "connect")
})

test("legacy dashboard and login paths normalize to current routes", () => {
  assert.equal(normalizePortalPath("/dashboard"), "/Access")
  assert.equal(normalizePortalPath("/login"), "/#sign-in")
  assert.equal(normalizePortalPath("/access"), "/")
  assert.equal(normalizePortalPath("/account"), "/")
})

test("route metadata keeps help public and account protected", () => {
  assert.equal(isProtectedPage("help"), false)
  assert.equal(isProtectedPage("account"), true)
  assert.equal(routeForPage("help"), "/Help")
})
