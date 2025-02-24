import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import fs from "fs"
import path from "path"

async function getLatestCliVersion() {
  const response = await fetch("https://registry.npmjs.org/@tscircuit/cli")
  const data = await response.json()
  return data["dist-tags"].latest
}

test("basic init", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Run the `tsci init` command
  const { stdout, stderr } = await runCommand("tsci init project")
  expect(stderr).toBe("")

  if (stdout.includes("\u26A0")) {
    expect(stdout).toMatch(/\u26A0/) // Check for warnings
  }

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
