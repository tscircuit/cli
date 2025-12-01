import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should skip binary files and show warning when pushing", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  // Create text files
  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  // Create a binary file (simulate a zip file with null bytes)
  const binaryContent = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00]) // ZIP file header with null bytes
  fs.writeFileSync(path.resolve(tmpDir, "gerbers.zip"), binaryContent)

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)

  // Should show warning about skipped binary file
  expect(stdout).toContain("Skipping binary file: gerbers.zip")
  expect(stdout).toContain("binary file(s) were skipped")

  // Should still successfully publish
  expect(stdout).toContain("published!")
  expect(stderr).toBe("")
}, 30_000)
