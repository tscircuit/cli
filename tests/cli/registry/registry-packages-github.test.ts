import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const setup = async () => {
  const fixture = await getCliTestFixture({ loggedIn: true })
  const created = await fixture.runCommand(
    "tsci registry packages create --package-name test-user/github-board",
  )
  expect(created.exitCode).toBe(0)
  const pkg = fixture.registryDb.packages.find(
    (p) => p.name === "test-user/github-board",
  )!
  // The fake registry's private-package lookup still requires this legacy field,
  // which its create endpoint does not populate.
  pkg.owner_github_username = fixture.registryDb.accounts[0].github_username
  return { ...fixture, packageId: pkg.package_id }
}

test("links the package.json package and preserves unrelated settings", async () => {
  const { tmpDir, runCommand, registryDb, packageId } = await setup()
  fs.writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.github-board" }),
  )
  const result = await runCommand(
    "tsci registry packages update --github-repo tscircuit/my-board",
  )
  expect(result.exitCode).toBe(0)
  const pkg = registryDb.packages.find((p) => p.package_id === packageId)!
  expect(pkg.github_repo_full_name).toBe("tscircuit/my-board")
  expect(pkg.is_private).toBe(true)
}, 30_000)

test("explicit package overrides cwd and unlink preserves other settings", async () => {
  const { tmpDir, runCommand, registryDb, packageId } = await setup()
  fs.writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/other.wrong" }),
  )
  expect(
    (
      await runCommand(
        "tsci registry packages update --package-name test-user/github-board --github-repo tscircuit/first",
      )
    ).exitCode,
  ).toBe(0)
  expect(
    (
      await runCommand(
        "tsci registry packages update --package-name test-user/github-board --github-repo tscircuit/second",
      )
    ).exitCode,
  ).toBe(0)
  expect(
    registryDb.packages.find((p) => p.package_id === packageId)
      ?.github_repo_full_name,
  ).toBe("tscircuit/second")
  expect(
    (
      await runCommand(
        "tsci registry packages update --package-name test-user/github-board --unlink-github",
      )
    ).exitCode,
  ).toBe(0)
  const pkg = registryDb.packages.find((p) => p.package_id === packageId)!
  expect(pkg.github_repo_full_name).toBeNull()
  expect(pkg.is_private).toBe(true)
}, 30_000)

test("invalid or conflicting flags fail without changing the repository", async () => {
  const { runCommand, registryDb, packageId } = await setup()
  for (const flags of [
    "--github-repo owner/repo --unlink-github",
    "--github-repo https://github.com/owner/repo",
    "--github-repo owner/repo/extra",
    "--github-repo repo",
    "--enable-public-dist --disable-public-dist --github-repo owner/repo",
    "",
  ]) {
    const result = await runCommand(
      `tsci registry packages update --package-name test-user/github-board ${flags}`,
    )
    expect(result.exitCode).toBe(1)
    expect(
      registryDb.packages.find((p) => p.package_id === packageId)
        ?.github_repo_full_name,
    ).toBeNull()
  }
}, 30_000)

test("missing local package fails with an actionable error", async () => {
  const { runCommand } = await getCliTestFixture({ loggedIn: true })
  const result = await runCommand(
    "tsci registry packages update --github-repo owner/repo",
  )
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("no package name found")
}, 30_000)

test("missing remote package surfaces the registry error", async () => {
  const { runCommand } = await getCliTestFixture({ loggedIn: true })
  const result = await runCommand(
    "tsci registry packages update --package-name test-user/missing --github-repo owner/repo",
  )
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("404")
}, 30_000)

test("unauthorized update does not modify the package", async () => {
  const { runCommand, registryDb } = await getCliTestFixture()
  const pkg = registryDb.packages[0]
  const original = pkg.github_repo_full_name
  const result = await runCommand(
    `tsci registry packages update --package-name ${pkg.name} --github-repo owner/repo`,
  )
  expect(result.exitCode).toBe(1)
  expect(
    registryDb.packages.find((p) => p.package_id === pkg.package_id)
      ?.github_repo_full_name,
  ).toBe(original)
}, 30_000)

test("authenticated user without package access receives a permission error", async () => {
  const { runCommand, registryDb, packageId } = await setup()
  const pkg = registryDb.packages.find((p) => p.package_id === packageId)!
  pkg.is_private = false
  pkg.owner_org_id = "another-org"
  const result = await runCommand(
    "tsci registry packages update --package-name test-user/github-board --github-repo owner/repo",
  )
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("403")
  expect(
    registryDb.packages.find((p) => p.package_id === packageId)
      ?.github_repo_full_name,
  ).toBeNull()
}, 30_000)

test("update payload includes only requested settings and resolves package IDs", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({ loggedIn: true })
  const { getCliConfig } = await import("lib/cli-config")
  const requests: Array<{ path: string; body: unknown }> = []
  // The bundled fake registry predates public_dist_enabled, so assert the HTTP
  // contract directly for this existing option and its combination with linking.
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const pathname = new URL(req.url).pathname
      requests.push({ path: pathname, body: await req.json() })
      return Response.json(
        pathname === "/packages/get"
          ? { package: { package_id: "pkg-id" } }
          : { ok: true },
      )
    },
  })
  try {
    getCliConfig({ configDir: path.join(tmpDir, ".config") }).set(
      "registryApiUrl",
      `http://localhost:${server.port}`,
    )
    for (const [flags, payload] of [
      ["--enable-public-dist", { public_dist_enabled: true }],
      [
        "--github-repo owner/repo --disable-public-dist",
        { github_repo_full_name: "owner/repo", public_dist_enabled: false },
      ],
      ["--unlink-github", { github_repo_full_name: null }],
    ] as const) {
      requests.length = 0
      const result = await runCommand(
        `tsci registry packages update --package-name @tsci/test-user.board.with.dots ${flags}`,
      )
      expect(result.exitCode).toBe(0)
      expect(requests).toEqual([
        { path: "/packages/get", body: { name: "test-user/board.with.dots" } },
        {
          path: "/packages/update",
          body: { package_id: "pkg-id", ...payload },
        },
      ])
    }
  } finally {
    server.stop(true)
  }
}, 30_000)
