import { expect, test } from "bun:test"
import { mkdir, readFile, readdir, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = (resistorName: string) => `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="${resistorName}" />
  </board>
)`

const TIMESTAMP_DIR_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z$/

test("rebuilding keeps the replaced circuit json in .tscircuit-build-history", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "my-board.circuit.tsx")
  const outputPath = path.join(tmpDir, "dist", "my-board", "circuit.json")
  const historyDir = path.join(tmpDir, ".tscircuit-build-history")
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  // Build workers resolve react from the project, not from the CLI.
  await mkdir(path.join(tmpDir, "node_modules"))
  await symlink(
    path.resolve("node_modules/react"),
    path.join(tmpDir, "node_modules/react"),
  )

  await writeFile(circuitPath, circuitCode("R_FIRST"))
  expect((await runCommand("tsci build")).exitCode).toBe(0)
  const firstBuild = await readFile(outputPath, "utf-8")
  expect(firstBuild).toContain("R_FIRST")
  // Nothing was replaced by the first build, so there is no history yet.
  expect(await Bun.file(historyDir).exists()).toBe(false)

  await writeFile(circuitPath, circuitCode("R_SECOND"))
  expect((await runCommand("tsci build")).exitCode).toBe(0)
  const secondBuild = await readFile(outputPath, "utf-8")
  expect(secondBuild).toContain("R_SECOND")

  const afterSecondBuild = await readdir(historyDir)
  expect(afterSecondBuild).toHaveLength(1)
  expect(afterSecondBuild[0]).toMatch(TIMESTAMP_DIR_PATTERN)
  expect(
    await readFile(
      path.join(
        historyDir,
        afterSecondBuild[0]!,
        "dist",
        "my-board",
        "circuit.json",
      ),
      "utf-8",
    ),
  ).toBe(firstBuild)

  // Worker builds archive too, and history directories sort oldest first.
  await writeFile(circuitPath, circuitCode("R_THIRD"))
  await writeFile(
    path.join(tmpDir, "other.circuit.tsx"),
    circuitCode("R_OTHER"),
  )
  expect((await runCommand("tsci build --concurrency 2")).exitCode).toBe(0)

  const afterThirdBuild = (await readdir(historyDir)).sort()
  expect(afterThirdBuild).toHaveLength(2)
  expect(afterThirdBuild[0]).toBe(afterSecondBuild[0]!)
  expect(
    await readFile(
      path.join(
        historyDir,
        afterThirdBuild[1]!,
        "dist",
        "my-board",
        "circuit.json",
      ),
      "utf-8",
    ),
  ).toBe(secondBuild)
}, 120_000)
