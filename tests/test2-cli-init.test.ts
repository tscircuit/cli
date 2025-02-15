import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { readdir } from "node:fs/promises"

test("basic init", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Run the `tsci init` command
  const { stdout, stderr } = await runCommand("tsci init")
  expect(stderr).toBe("")

  const dirContents = (await readdir(tmpDir)).sort((a, b) => {
    // Define custom sort order based on the expected snapshot
    const order = [
      "package-lock.json",
      "node_modules",
      ".gitignore",
      "tsconfig.json",
      "package.json",
      ".npmrc",
      "index.tsx",
    ]
    return order.indexOf(a) - order.indexOf(b)
  })

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
