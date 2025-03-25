import { expect, test } from "bun:test"
import { join } from "node:path"
import { readdirSync } from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("clone command fetches and creates package files correctly", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const { stdout } = await runCommand("tsci clone testuser/my-test-board")

  const projectDir = join(tmpDir, "testuser.my-test-board")
  const dirFiles = readdirSync(projectDir)

  expect(dirFiles).toMatchInlineSnapshot(`
    [
      "index.tsx",
      "node_modules",
      ".npmrc",
      "package-lock.json",
      "package.json",
      "tsconfig.json",
      "circuit.json",
    ]
  `)
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
