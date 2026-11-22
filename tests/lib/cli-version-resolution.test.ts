import { afterEach, describe, expect, test } from "bun:test"
import { currentCliVersion } from "lib/shared/check-for-cli-update"
import { getVersionInfo } from "lib/getVersion"
import pkg from "../../package.json"

describe("CLI version resolution (#4628)", () => {
  afterEach(() => {
    delete (globalThis as any).TSCIRCUIT_VERSION
  })

  test("currentCliVersion() reports the installed version, not a synthetic +1 patch", () => {
    // Regression guard: the old implementation returned
    // `semver.inc(pkgVersion, "patch")`, i.e. one patch ABOVE the real
    // version, which made the update check loop forever (0.1.2020 -> 0.1.2021).
    expect(currentCliVersion()).toBe(pkg.version)
  })

  test("currentCliVersion() never reports a version greater than the installed one", () => {
    const reported = currentCliVersion()
    // The reported version must not be a synthetic bump above package.json.
    expect(reported).not.toBe(
      `${pkg.version.split(".")[0]}.${pkg.version.split(".")[1]}.${
        Number(pkg.version.split(".")[2]) + 1
      }`,
    )
  })

  test("getVersionInfo().cliVersion matches the installed package.json version", () => {
    const { cliVersion } = getVersionInfo()
    expect(cliVersion).toBe(pkg.version)
  })
})
