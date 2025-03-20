import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { readdirSync } from "node:fs"

test("clone command fetches and creates package files correctly", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const { stdout, stderr } = await runCommand("tsci clone author/snippet")
expect(stdout).toContain("Cloning author/snippet...")


  // Verify directory structure
  const projectDir = join(tmpDir, "author.snippet")
  const indexPath = join(projectDir, "index.tsx")
  const tsconfigPath = join(projectDir, "tsconfig.json")
  const npmrcPath = join(projectDir, ".npmrc")

  const indexContent = await Bun.file(indexPath).text()
  const tsconfigContent = await Bun.file(tsconfigPath).text()
  const npmrcContent = await Bun.file(npmrcPath).text()

  expect(indexContent).toContain(
    'export default () => <board width="10mm" height="10mm" />',
  )
  expect(JSON.parse(tsconfigContent)).toHaveProperty("compilerOptions")
  expect(npmrcContent).toContain("@tsci:registry=https://npm.tscircuit.com")

  // Verify stdout messages
  
  expect(stdout).toContain("Successfully cloned")
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
}, 10_000)
