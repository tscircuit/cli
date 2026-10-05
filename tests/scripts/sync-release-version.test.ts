import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"

const script = resolve(
  import.meta.dir,
  "../../scripts/sync-release-version.mjs",
)

function syncVersion(version: string, tags: string[]) {
  const cwd = mkdtempSync(resolve(tmpdir(), "cli-release-version-"))
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd, stdio: "pipe" })
  const original = `${JSON.stringify({ name: "@tscircuit/cli", version }, null, 2)}\n`
  try {
    writeFileSync(resolve(cwd, "package.json"), original)
    git("init")
    git("add", "package.json")
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-m",
      "Initial package",
    )
    for (const tag of tags) git("tag", tag)
    execFileSync("node", [script], { cwd, stdio: "pipe" })
    const contents = readFileSync(resolve(cwd, "package.json"), "utf8")
    return { version: JSON.parse(contents).version, contents, original }
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

test("recovers the failing release with more than ten existing versions", () => {
  const tags = Array.from({ length: 11 }, (_, i) => `v0.1.${2238 + i}`)
  expect(syncVersion("0.1.2237", tags).version).toBe("0.1.2248")
})

test("orders versions numerically across major, minor and patch changes", () => {
  expect(syncVersion("0.1.9", ["v0.1.10", "v0.2.0"]).version).toBe("0.2.0")
  expect(syncVersion("0.9.99", ["v1.0.0", "v0.10.0"]).version).toBe("1.0.0")
})

test("ignores prerelease and unrelated tags", () => {
  const result = syncVersion("0.1.2237", [
    "v0.1.2248",
    "v1.0.0-beta.1",
    "release-2.0.0",
    "v01.2.3",
  ])
  expect(result.version).toBe("0.1.2248")
})

test("preserves the package when it is ahead of existing tags", () => {
  const result = syncVersion("0.2.0", ["v0.1.2248"])
  expect(result.contents).toBe(result.original)
})

test("preserves the package when there are no release tags", () => {
  const result = syncVersion("0.1.2237", [])
  expect(result.contents).toBe(result.original)
})
