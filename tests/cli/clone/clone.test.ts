import { expect, test } from "bun:test"
import { join } from "node:path"
import { readdirSync, existsSync, readFileSync } from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("clone command fetches and creates package files correctly", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const { stdout } = await runCommand("tsci clone testuser/my-test-board")

  const projectDir = join(tmpDir, "my-test-board")
  const dirFiles = readdirSync(projectDir).sort()

  expect(dirFiles).toMatchInlineSnapshot(`
    [
      ".gitignore",
      ".npmrc",
      "README.md",
      "bun.lock",
      "dist",
      "index.tsx",
      "node_modules",
      "package.json",
      "tsconfig.json",
    ]
  `)

  const packageJson = JSON.parse(
    readFileSync(join(projectDir, "package.json"), "utf-8"),
  )
  expect(packageJson.scripts.dev).toBe("tsci dev")
  expect(packageJson.scripts.start).toBe("tsci dev")
}, 10_000)

test("clone command handles invalid package path", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stderr } = await runCommand("tsci clone invalid-path")
  expect(stderr).toContain("Invalid package path")
})

test("clone command handles API errors gracefully", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stderr } = await runCommand("tsci clone author/non-exisent-snippet")
  expect(stderr).toContain("not found")
})

test("clone command rejects invalid URL formats", async () => {
  const { runCommand } = await getCliTestFixture()

  const testCases = [
    "https://google.com/user/board",
    "https://tscircuit.com/",
    "https://tscircuit.com/user",
    "https://tscircuit.com/user/",
    "http://tscircuit.com/user/board",
    "https://tscircuit.com/user/board/extra#files",
    "https://tscircuit.com/user/#files",
    "https://tscircuit.com/user/?version=1.0.0",
  ]

  for (const url of testCases) {
    const { stderr } = await runCommand(`tsci clone ${url}`)
    expect(stderr).toContain("Invalid package path")
  }
}, 20_000)

test.each([
  "https://tscircuit.com/testuser/my-test-board#files",
  "https://tscircuit.com/testuser/my-test-board/#3d",
  "https://tscircuit.com/testuser/my-test-board?version=1.0.0",
  "https://tscircuit.com/testuser/my-test-board/?version=1.0.0#files",
])(
  "clone command ignores URL query and fragment in %s",
  async (url) => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const { stdout, stderr, exitCode } = await runCommand(`tsci clone ${url}`)

    expect(exitCode).toBe(0)
    expect(stdout).toContain("Cloning testuser/my-test-board...")
    expect(stdout).toContain("Successfully cloned")
    expect(stderr).not.toContain("not found")
    expect(existsSync(join(tmpDir, "my-test-board", "index.tsx"))).toBe(true)
  },
  30_000,
)

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
    expect(stdout).not.toContain("not found")
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
