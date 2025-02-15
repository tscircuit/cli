import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { readdir } from "node:fs/promises"

test("basic init", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Run the `tsci init` command
  const { stdout, stderr } = await runCommand("tsci init")
  expect(stderr).toBe("")

  const dirContents = (await readdir(tmpDir)).sort().join("\n,")

  expect(dirContents).toMatchInlineSnapshot(`
[
  ".gitignore",
  ".npmrc",
  "index.tsx",
  "node_modules",
  "package-lock.json",
  "package.json",
  "tsconfig.json"
]
`)
})
