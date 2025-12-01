import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should skip files with binary content even without binary extension", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  // Create text files
  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package2", version: "1.0.0" }),
  )

  // Create a file with binary content but text-like extension
  // This simulates a corrupted or mislabeled file
  const binaryContent = Buffer.from([0x48, 0x65, 0x6c, 0x00, 0x6f]) // "Hel\0o" - contains null byte
  fs.writeFileSync(path.resolve(tmpDir, "data.txt"), binaryContent)

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)

  // Should show warning about skipped binary file
  expect(stdout).toContain("Skipping binary file: data.txt")

  // Should still successfully publish
  expect(stdout).toContain("published!")
  expect(stderr).toBe("")
}, 30_000)
