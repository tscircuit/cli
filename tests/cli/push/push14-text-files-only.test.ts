import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should upload text files normally", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  // Create only text files
  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package4", version: "1.0.0" }),
  )
  fs.writeFileSync(path.resolve(tmpDir, "README.md"), "# Test Package")
  fs.writeFileSync(
    path.resolve(tmpDir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: {} }),
  )

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)

  // Should upload all text files with ⬆︎ icon (not 📦 which is for binary)
  expect(stdout).toContain("⬆︎ package.json")
  expect(stdout).toContain("⬆︎ snippet.tsx")
  expect(stdout).toContain("⬆︎ README.md")
  expect(stdout).toContain("⬆︎ tsconfig.json")

  // Should NOT have any binary file uploads
  expect(stdout).not.toContain("📦")

  // Should successfully publish
  expect(stdout).toContain("published!")
  expect(stderr).toBe("")
}, 30_000)
