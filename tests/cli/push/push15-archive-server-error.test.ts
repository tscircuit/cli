import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { getCliConfig } from "lib/cli-config"
import { writeFileSync } from "node:fs"
import { join } from "node:path"

test("an ambiguous archive failure stops push without individual uploads", async () => {
  const { tmpDir, runCommand, registryApiUrl } = await getCliTestFixture({
    loggedIn: true,
  })
  writeFileSync(join(tmpDir, "snippet.tsx"), "// Snippet content")
  writeFileSync(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )
  const writes: string[] = []
  const proxy = Bun.serve({
    port: 0,
    async fetch(request) {
      const pathname = new URL(request.url).pathname
      if (pathname.startsWith("/api/package_files/")) writes.push(pathname)
      if (pathname === "/api/package_files/upload_archive") {
        return Response.json(
          { error: { error_code: "internal_error", message: "Test failure" } },
          { status: 500 },
        )
      }
      return fetch(
        new Request(`${new URL(registryApiUrl).origin}${pathname}`, request),
      )
    },
  })
  getCliConfig({ configDir: join(tmpDir, ".config") }).set(
    "registryApiUrl",
    `${proxy.url.origin}/api`,
  )
  try {
    const { stdout, stderr, exitCode } = await runCommand(
      `tsci push ${join(tmpDir, "snippet.tsx")} --compress`,
    )
    expect(exitCode).toBe(1)
    expect(writes).toEqual(["/api/package_files/upload_archive"])
    expect(stderr).toContain("Archive upload was not confirmed")
    expect(stderr).toContain("No individual files were retried")
    expect(stdout).not.toContain("published!")
    expect(stdout).not.toContain("falling back")
  } finally {
    proxy.stop(true)
  }
}, 30_000)
