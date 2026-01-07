import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("tsci push ignores dist directory", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")
  const distFilePath = path.resolve(tmpDir, "dist", "output.js")

  fs.mkdirSync(path.dirname(distFilePath), { recursive: true })
  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(distFilePath, "console.log('dist output')")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)

  expect(stderr).toBe("")
  expect(stdout).toContain("⬆︎ package.json")
  expect(stdout).toContain("⬆︎ snippet.tsx")
  expect(stdout).not.toContain("dist/output.js")
})
