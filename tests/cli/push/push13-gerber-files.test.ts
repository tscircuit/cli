import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should upload gerber files using base64 encoding", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  // Create text files
  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package3", version: "1.0.0" }),
  )

  // Create gerber files (common in PCB projects)
  fs.mkdirSync(path.resolve(tmpDir, "gerbers"))
  fs.writeFileSync(
    path.resolve(tmpDir, "gerbers/board.gbr"),
    Buffer.from([0x47, 0x34, 0x00, 0x00]), // Gerber-like content with null bytes
  )
  fs.writeFileSync(
    path.resolve(tmpDir, "gerbers/board-F_Mask.gbr"),
    Buffer.from([0x47, 0x34, 0x00, 0x00]),
  )

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)

  // Should upload gerber files with 📦 icon
  expect(stdout).toContain("📦 gerbers/board.gbr")
  expect(stdout).toContain("📦 gerbers/board-F_Mask.gbr")

  // Should successfully publish
  expect(stdout).toContain("published!")
  expect(stderr).toBe("")
}, 30_000)
