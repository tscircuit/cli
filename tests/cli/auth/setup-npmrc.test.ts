import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const setupNpmrcPath = fileURLToPath(
  new URL("../../../cli/auth/setup-npmrc/setup-npmrc.ts", import.meta.url),
)

const updateNpmrc = (content: string, token: string) => {
  const homeDir = mkdtempSync(path.join(os.tmpdir(), "tsci-npmrc-test-"))
  globalThis.deferredCleanupFns.push(() =>
    rm(homeDir, { recursive: true, force: true }),
  )
  const npmrcPath = path.join(homeDir, ".npmrc")
  writeFileSync(npmrcPath, content)

  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      "--eval",
      `import { setupNpmrc } from ${JSON.stringify(setupNpmrcPath)};
       if (!setupNpmrc(${JSON.stringify(token)})) process.exit(1);`,
    ],
    env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
    stdout: "pipe",
    stderr: "pipe",
  })

  expect(result.exitCode).toBe(0)
  expect(result.stderr.toString()).toBe("")
  return readFileSync(npmrcPath, "utf8")
}

for (const newline of ["\n", "\r\n"]) {
  test(`setup-npmrc replaces duplicate auth entries with ${JSON.stringify(newline)} line endings`, () => {
    const lines = [
      "@tsci:registry=https://npm.tscircuit.com/",
      "//npm.tscircuit.com/:_authToken=old-first-token",
      "# Preserve other settings",
      "//registry.npmjs.org/:_authToken=other-registry-token",
      "//npm.tscircuit.com/:_authToken=old-last-token",
      "",
    ]

    const updated = updateNpmrc(lines.join(newline), "new-token")

    lines[1] = "//npm.tscircuit.com/:_authToken=new-token"
    lines[4] = "//npm.tscircuit.com/:_authToken=new-token"
    expect(updated).toBe(lines.join(newline))
  })
}

test("setup-npmrc treats replacement tokens as literal strings", () => {
  const updated = updateNpmrc(
    "@tsci:registry=https://npm.tscircuit.com/\n//npm.tscircuit.com/:_authToken=old-token\n",
    "new-$&-token",
  )

  expect(updated).toBe(
    "@tsci:registry=https://npm.tscircuit.com/\n//npm.tscircuit.com/:_authToken=new-$&-token\n",
  )
})
