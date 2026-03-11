import { test, expect } from "bun:test"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import {
  getIsPrivateFromOptions,
  getRegistryPackageName,
} from "cli/registry/packages/create/register"

test(
  "tsci registry packages create creates a private package by default",
  async () => {
    const { runCommand, registryDb } = await getCliTestFixture({
      loggedIn: true,
    })

    const { stdout, stderr, exitCode } = await runCommand(
      "tsci registry packages create --package-name test-user/demo-package",
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout).toContain("Created package test-user/demo-package")

    const createdPackage = registryDb.packages.find(
      (pkg) => pkg.name === "test-user/demo-package",
    )
    expect(createdPackage).toBeDefined()
    expect(createdPackage?.is_private).toBe(true)
  },
  { timeout: 30_000 },
)

test("registry package name uses @tsci org prefix when --org is provided", () => {
  expect(getRegistryPackageName({ packageName: "adc", org: "acme" })).toBe(
    "@tsci/acme.adc",
  )
  expect(getRegistryPackageName({ packageName: "test-user/adc" })).toBe(
    "test-user/adc",
  )
})

test("visibility flags default to private and --public overrides", () => {
  expect(getIsPrivateFromOptions({})).toBe(true)
  expect(getIsPrivateFromOptions({ isPrivate: true })).toBe(true)
  expect(getIsPrivateFromOptions({ isPublic: true })).toBe(false)
})
