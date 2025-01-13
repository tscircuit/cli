import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { readdir } from "node:fs/promises"

test("basic init", async () => {
  const { tmpDir, runCommand, cleanup } = await getCliTestFixture()

  try {
    // Run the `tsci init` command
    const { stdout, stderr } = await runCommand("tsci init")
    expect(stderr).toBe("")

    // List directory contents
    const dirContents = await readdir(tmpDir)
    expect(dirContents).toMatchInlineSnapshot(`
[
  ".npmrc",
  "index.tsx",
]
`)
  } finally {
    await cleanup()
  }
})
