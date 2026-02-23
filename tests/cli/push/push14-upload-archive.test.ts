import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should attempt archive upload when TSCI_PUSH_ARCHIVE is enabled", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({ loggedIn: true })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const previousArchiveFlag = process.env.TSCI_PUSH_ARCHIVE
  process.env.TSCI_PUSH_ARCHIVE = "1"

  let stdout = ""
  let stderr = ""
  try {
    const result = await runCommand(`tsci push ${snippetFilePath}`)
    stdout = result.stdout
    stderr = result.stderr
  } finally {
    process.env.TSCI_PUSH_ARCHIVE = previousArchiveFlag
  }

  expect(stderr).toBe("")
  expect(stdout).toContain("Uploading package archive...")
  expect(stdout).toContain(
    "Archive upload failed, falling back to file-by-file upload",
  )
  expect(stdout).toContain("⬆︎ package.json")
  expect(stdout).toContain("⬆︎ snippet.tsx")
  expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
}, 30_000)
