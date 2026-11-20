import { expect, test } from "bun:test"
import {
  getIsPrivateFromOptions,
  getRegistryPackageName,
} from "cli/registry/packages/create/register"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

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

test("registry package name uses the registry org/name format when --org is provided", () => {
  expect(getRegistryPackageName({ packageName: "adc", org: "acme" })).toBe(
    "acme/adc",
  )
  expect(getRegistryPackageName({ packageName: "test-user/adc" })).toBe(
    "test-user/adc",
  )
})

test.each([
  { flags: "", isPrivate: true, isUnlisted: false },
  { flags: "--public", isPrivate: false, isUnlisted: false },
  { flags: "--private", isPrivate: true, isUnlisted: false },
  { flags: "--unlisted", isPrivate: true, isUnlisted: true },
])(
  "--org creates a registry package with visibility $flags",
  async ({ flags, isPrivate, isUnlisted }) => {
    const { runCommand, registryDb } = await getCliTestFixture({
      loggedIn: true,
    })
    const { stdout, stderr, exitCode } = await runCommand(
      `tsci registry packages create --package-name org-board --org test-user ${flags}`.trim(),
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout).toContain("Created package test-user/org-board")
    const pkg = registryDb.packages.find(
      (pkg) => pkg.name === "test-user/org-board",
    )
    expect(pkg).toBeDefined()
    expect(pkg?.is_private).toBe(isPrivate)
    if (isUnlisted) expect(pkg?.is_unlisted).toBe(true)
  },
  30_000,
)

test("visibility flags default to private and --public overrides", () => {
  expect(getIsPrivateFromOptions({})).toBe(true)
  expect(getIsPrivateFromOptions({ isPrivate: true })).toBe(true)
  expect(getIsPrivateFromOptions({ isPublic: true })).toBe(false)
})
