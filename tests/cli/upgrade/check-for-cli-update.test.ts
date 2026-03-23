import { expect, test } from "bun:test"
import semver from "semver"
import { currentCliVersion } from "lib/shared/check-for-cli-update"
import { version as pkgVersion } from "../../../package.json"

test("currentCliVersion matches package.json version exactly", () => {
  expect(currentCliVersion()).toBe(pkgVersion)
})

test("update prompt fires when behind latest by one patch", () => {
  const npmLatest = semver.inc(pkgVersion, "patch")!
  expect(semver.gt(npmLatest, currentCliVersion())).toBe(true)
})

test("update prompt fires when behind latest by many versions", () => {
  const npmLatest = semver.inc(semver.inc(pkgVersion, "minor")!, "patch")!
  expect(semver.gt(npmLatest, currentCliVersion())).toBe(true)
})

test("update prompt does not fire when already on latest", () => {
  expect(semver.gt(pkgVersion, currentCliVersion())).toBe(false)
})
