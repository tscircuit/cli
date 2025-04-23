import { expect, test } from "bun:test"
import { join } from "node:path"
import { readdirSync, existsSync } from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("clone command fetches and creates package files correctly", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const { stdout } = await runCommand("tsci clone testuser/my-test-board")

  const projectDir = join(tmpDir, "my-test-board")
  const dirFiles = readdirSync(projectDir)

  expect(dirFiles).toContainValues([
    "index.tsx",
    "node_modules",
    ".npmrc",
    "bun.lock",
    "README.md",
    ".gitignore",
    "package.json",
    "tsconfig.json",
    "circuit.json",
  ])
}, 10_000)

test("clone command handles invalid snippet path", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stderr } = await runCommand("tsci clone invalid-path")
  expect(stderr).toContain("Invalid snippet path")
})

test("clone command handles API errors gracefully", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stderr } = await runCommand("tsci clone author/non-exisent-snippet")
  expect(stderr).toContain("Failed to fetch package files")
})

test("clone command rejects invalid URL formats", async () => {
  const { runCommand } = await getCliTestFixture()

  const testCases = [
    "https://google.com/user/board",
    "https://tscircuit.com/",
    "https://tscircuit.com/user",
    "https://tscircuit.com/user/",
    "http://tscircuit.com/user/board",
  ]

  for (const url of testCases) {
    const { stderr } = await runCommand(`tsci clone ${url}`)
    expect(stderr).toContain("Invalid snippet path")
  }
})

test("clone command accepts all valid formats", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const testCases = [
    "testuser/my-test-board",
    "testuser.my-test-board",
    "@tsci/testuser.my-test-board",
    "https://tscircuit.com/testuser/my-test-board",
  ]

  for (const format of testCases) {
    const { stdout } = await runCommand(`tsci clone ${format}`)
    const projectDir = join(tmpDir, "my-test-board")
    const dirFiles = readdirSync(projectDir)

    expect(dirFiles).toContainValues(["package.json"])
    expect(stdout).toContain("Successfully cloned")
  }
}, 20_000)

test("clone command with --include-author flag creates correct directory", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const { stdout } = await runCommand(
    "tsci clone --include-author testuser/my-test-board",
  )

  const projectDir = join(tmpDir, "testuser.my-test-board")
  const dirExists = existsSync(projectDir)
  const dirFiles = readdirSync(projectDir)

  expect(dirExists).toBe(true)
  expect(stdout).toContain("Successfully cloned")
  expect(dirFiles).toContainValues(["package.json"]) // Basic check
}, 10_000)

test("clone command with -a flag creates correct directory", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const { stdout } = await runCommand("tsci clone -a testuser/my-test-board")

  const projectDir = join(tmpDir, "testuser.my-test-board")
  const dirExists = existsSync(projectDir)
  const dirFiles = readdirSync(projectDir)

  expect(dirExists).toBe(true)
  expect(stdout).toContain("Successfully cloned")
  expect(dirFiles).toContainValues(["package.json"]) // Basic check
}, 10_000)
