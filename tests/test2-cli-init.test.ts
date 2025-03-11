import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"

test("basic init", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Run the `tsci init` command
  const { stdout, stderr } = await runCommand("tsci init project")
  expect(stderr).toBe("")

  const dirContents = fs.readdirSync(path.join(tmpDir, "project"))

  expect(dirContents).toContainValues([
    ".gitignore",
    ".npmrc",
    "index.tsx",
    "node_modules",
    "package-lock.json",
    "package.json",
    "tsconfig.json",
  ])
}, 10_000)
