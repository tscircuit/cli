import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { readdir } from "node:fs/promises"

test("basic init", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Run the `tsci init` command
  const { stdout, stderr } = await runCommand("tsci init")
  expect(stderr).toBe("")

  // List directory contents
  const dirContents = await readdir(tmpDir)
  expect(dirContents).toMatchInlineSnapshot(`
[ 
  "package-lock.json",
  "node_modules",
  ".gitignore",
  "tsconfig.json",
  "package.json",
  ".npmrc",
  "index.tsx",
]
`)
})
