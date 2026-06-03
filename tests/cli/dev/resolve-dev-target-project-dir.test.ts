import { expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { resolveDevTarget } from "cli/dev/resolve-dev-target"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("resolveDevTarget uses the input file project directory", async () => {
  const { tmpDir } = await getCliTestFixture()
  const nestedProjectDir = join(tmpDir, "nested-project")
  const circuitPath = join(nestedProjectDir, "index.circuit.tsx")

  await mkdir(nestedProjectDir, { recursive: true })
  await writeFile(
    join(nestedProjectDir, "package.json"),
    JSON.stringify({ name: "nested-project" }),
  )
  await writeFile(
    join(nestedProjectDir, "tscircuit.config.ts"),
    "export default { includeBoardFiles: ['**/*.circuit.tsx'] }\n",
  )
  await writeFile(
    circuitPath,
    'export default () => <board width="10mm" height="10mm" />\n',
  )

  const originalCwd = process.cwd()
  process.chdir(tmpDir)

  try {
    const resolved = await resolveDevTarget(circuitPath)
    expect(resolved).not.toBeNull()
    expect(resolved?.absolutePath).toBe(circuitPath)
    expect(resolved?.projectDir).toBe(nestedProjectDir)
  } finally {
    process.chdir(originalCwd)
  }
})
