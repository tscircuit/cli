import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"

test("basic init", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Run the `tsci init` command
  const { stdout, stderr } = await runCommand("tsci init project")

  const dirContents = fs.readdirSync(path.join(tmpDir, "project"))

  const expectedFiles = [
    ".gitignore",
    ".npmrc",
    "index.circuit.tsx",
    "package.json",
    "tsconfig.json",
  ]

  for (const file of expectedFiles) {
    expect(dirContents).toContain(file)
  }

  const gitignoreContent = fs.readFileSync(
    path.join(tmpDir, "project", ".gitignore"),
    "utf-8",
  )
  expect(gitignoreContent).toContain(".tscircuit/")
}, 15_000)
