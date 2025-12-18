import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { getDefaultTscircuitVersion } from "lib/shared/get-default-tscircuit-version"

test("basic init", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Run the `tsci init` command
  const { stdout, stderr } = await runCommand("tsci init project --no-install")

  const dirContents = fs.readdirSync(path.join(tmpDir, "project"))

  const expectedFiles = [
    ".gitignore",
    ".npmrc",
    "index.tsx",
    "package.json",
    "tsconfig.json",
  ]

  for (const file of expectedFiles) {
    expect(dirContents).toContain(file)
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(tmpDir, "project", "package.json"), "utf-8"),
  )

  expect(packageJson.devDependencies.tscircuit).toBe(
    getDefaultTscircuitVersion(),
  )
}, 15_000)
