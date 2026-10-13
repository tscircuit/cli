import { expect, test } from "bun:test"
import ky from "ky"
import { getCliConfig } from "lib/cli-config"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const setup = async ({
  canManageOrg = false,
  omitPackagePermissions = false,
  rejectRelease = false,
} = {}) => {
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

  const requests: string[] = []
  const proxy = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      const pathname = new URL(request.url).pathname
      requests.push(pathname)
      // Consume the body before an early response or forwarding it. Streaming
      // it through the proxy breaks archive-upload fallback on Bun 1.3.5.
      const requestBody = request.body ? await request.arrayBuffer() : undefined

      // The fake registry does not enforce release authorization. Simulate an
      // API refusal so the CLI must stop before uploading or finalizing a release.
      if (rejectRelease && pathname === "/api/package_releases/create") {
        return Response.json(
          { error: { error_code: "forbidden", message: "Publishing denied" } },
          { status: 403 },
        )
      }

      const upstreamUrl = new URL(request.url)
      upstreamUrl.host = new URL(registryApiUrl).host
      const response = await fetch(upstreamUrl, {
        method: request.method,
        headers: request.headers,
        body: requestBody,
      })
      if (omitPackagePermissions && pathname === "/api/packages/get") {
        const body = await response.json()
        delete body.package.user_permissions
        return Response.json(body, { status: response.status })
      }
      return response
    },
  })
  globalThis.deferredCleanupFns.push(async () => {
    proxy.stop(true)
  })
  getCliConfig({ configDir: path.join(tmpDir, ".config") }).set(
    "registryApiUrl",
    `http://127.0.0.1:${proxy.port}/api`,
  )

  return { ...fixture, registry, org, membership, pkg, packageName, requests }
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

  // Publishing must not require permission to administer the organization.
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

test("push publishes with default compression when package permissions are omitted", async () => {
  const { runCommand, registryDb, pkg } = await setup({
    omitPackagePermissions: true,
  })

  const { stdout, stderr, exitCode } = await runCommand("tsci push")

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

test("push stops when the registry denies a non-member permission to create a release", async () => {
  const {
    runCommand,
    registryDb,
    registry,
    membership,
    pkg,
    packageName,
    requests,
  } = await setup({ rejectRelease: true })
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

  const { stdout, stderr, exitCode } = await runCommand("tsci push")

  expect(exitCode).toBe(1)
  expect(stderr).toContain("Error creating release:")
  expect(stderr).toContain("403")
  expect(stderr).toContain("Publishing denied")
  expect(stdout).not.toContain("published!")
  expect(requests).toContain("/api/package_releases/create")
  expect(requests).not.toContain("/api/package_files/upload_archive")
  expect(requests).not.toContain("/api/package_files/create")
  expect(requests).not.toContain("/api/package_releases/update")
  expect(
    registryDb.packageReleases.filter(
      (release) => release.package_id === pkg.package_id,
    ),
  ).toHaveLength(0)
}, 30_000)

test("push respects a registry refusal even with org-management permission", async () => {
  const { runCommand, requests } = await setup({
    canManageOrg: true,
    rejectRelease: true,
  })

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci push --no-compress",
  )

  expect(exitCode).toBe(1)
  expect(stderr).toContain("Publishing denied")
  expect(stdout).not.toContain("published!")
  expect(requests).toContain("/api/package_releases/create")
  expect(requests).not.toContain("/api/package_files/create")
  expect(requests).not.toContain("/api/package_releases/update")
}, 30_000)
