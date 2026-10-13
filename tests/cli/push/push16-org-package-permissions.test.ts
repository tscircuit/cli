import { expect, test } from "bun:test"
import ky from "ky"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const setup = async ({ canManageOrg = false } = {}) => {
  const fixture = await getCliTestFixture({ loggedIn: true })
  const { tmpDir, registryDb, registryApiUrl } = fixture
  const account = registryDb.accounts[0]
  const owner = registryDb.addAccount({
    github_username: "org-owner",
    tscircuit_handle: "org-owner",
  })
  const org = registryDb.addOrganization({
    tscircuit_handle: "publishing-org",
    owner_account_id: owner.account_id,
  })
  const membership = registryDb.addOrganizationAccount({
    org_id: org.org_id,
    account_id: account.account_id,
    is_owner: canManageOrg,
  })
  const registry = ky.create({
    prefixUrl: registryApiUrl,
    headers: { Authorization: `Bearer ${account.account_id}` },
  })
  const packageName = "publishing-org/existing-board"
  const { package: pkg } = await registry
    .post("packages/create", {
      json: { name: packageName, is_private: false },
    })
    .json<{ package: { package_id: string } }>()

  writeFileSync(path.join(tmpDir, "snippet.tsx"), "// Snippet content")
  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: packageName, version: "1.0.0" }),
  )

  return { ...fixture, registry, org, membership, pkg, packageName }
}

test("push publishes an existing org package without org-management permission", async () => {
  const { runCommand, registry, org, pkg, packageName, registryDb } =
    await setup()

  const { org: visibleOrg } = await registry
    .post("orgs/get", { json: { tscircuit_handle: org.tscircuit_handle } })
    .json<{ org: { user_permissions?: { can_manage_org?: boolean } } }>()
  const { package: visiblePackage } = await registry
    .post("packages/get", { json: { name: packageName } })
    .json<{
      package: { user_permissions: { can_manage_packages: boolean } }
    }>()

  // The fake registry grants package management to org members, but omits
  // org.user_permissions unless they can also administer the organization.
  expect(visibleOrg.user_permissions).toBeUndefined()
  expect(visiblePackage.user_permissions.can_manage_packages).toBe(true)

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci push --no-compress",
  )

  // Reproduction: push currently exits 1 at checkOrgAccess before checking
  // the existing package, despite the package-level permission above.
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain(
    '"@tsci/publishing-org.existing-board@1.0.0" published!',
  )
  expect(
    registryDb.packageReleases.find(
      (release) => release.package_id === pkg.package_id,
    )?.ready_to_build,
  ).toBe(true)
}, 30_000)

test("push publishes the same package with org-management permission", async () => {
  const { runCommand } = await setup({ canManageOrg: true })

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci push --no-compress",
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain(
    '"@tsci/publishing-org.existing-board@1.0.0" published!',
  )
}, 30_000)

test("push rejects publishing when neither package nor org access is granted", async () => {
  const { runCommand, registryDb, registry, membership, pkg, packageName } =
    await setup()
  registryDb.removeOrganizationAccount({
    org_id: membership.org_id,
    account_id: membership.account_id,
  })

  const { package: visiblePackage } = await registry
    .post("packages/get", { json: { name: packageName } })
    .json<{
      package: { user_permissions: { can_manage_packages: boolean } }
    }>()
  expect(visiblePackage.user_permissions.can_manage_packages).toBe(false)

  const { stderr, exitCode } = await runCommand("tsci push --no-compress")

  expect(exitCode).toBe(1)
  expect(stderr).not.toBe("")
  expect(
    registryDb.packageReleases.filter(
      (release) => release.package_id === pkg.package_id,
    ),
  ).toHaveLength(0)
}, 30_000)
