import { test, expect } from "bun:test"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test.skip("should fail if package.json is missing or invalid", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")
  fs.writeFileSync(snippetFilePath, "// Snippet content")

  try {
    await runCommand(`tsci push ${snippetFilePath}`)
  } catch (error) {
    expect(console.error).toHaveBeenCalledWith(
      "Failed to retrieve package version.",
    )
  }
})
