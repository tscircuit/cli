import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should NOT upload dist directory by default", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  fs.mkdirSync(path.resolve(tmpDir, "dist"))
  fs.writeFileSync(path.resolve(tmpDir, "dist/index.js"), "// Built content")
  fs.writeFileSync(path.resolve(tmpDir, "dist/index.d.ts"), "// Type defs")

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)

  expect(stdout).not.toContain("dist\\index.js")
  expect(stdout).not.toContain("dist/index.js")
  expect(stdout).not.toContain("dist\\index.d.ts")
  expect(stdout).not.toContain("dist/index.d.ts")
  expect(stdout).toContain("published!")
  expect(stderr).toBe("")
}, 30_000)

test("should upload dist directory when --include-dist flag is passed", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  fs.mkdirSync(path.resolve(tmpDir, "dist"))
  fs.writeFileSync(path.resolve(tmpDir, "dist/index.js"), "// Built content")
  fs.writeFileSync(path.resolve(tmpDir, "dist/index.d.ts"), "// Type defs")

  const { stdout, stderr } = await runCommand(
    `tsci push ${snippetFilePath} --include-dist`,
  )

  expect(stdout).toMatch(/dist[\\\/]index\.js/)
  expect(stdout).toMatch(/dist[\\\/]index\.d\.ts/)
  expect(stdout).toContain("published!")
  expect(stderr).toBe("")
}, 30_000)
