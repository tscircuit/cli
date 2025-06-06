import { test, expect } from "bun:test"
import { join } from "node:path"
import { readFileSync, writeFileSync } from "node:fs"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test.skip("pull command updates files from registry", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await runCommand("tsci clone testuser/my-test-board")

  const projectDir = join(tmpDir, "my-test-board")
  const filePath = join(projectDir, "index.tsx")
  const packageJsonPath = join(projectDir, "package.json")
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"))
  pkg.name = "@tsci/testuser.my-test-board"
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2))
  const original = readFileSync(filePath, "utf8")
  writeFileSync(filePath, "// modified")

  await runCommand("tsci pull my-test-board")

  const pulled = readFileSync(filePath, "utf8")
  expect(pulled).toBe(original)
}, 20_000)
