import { expect, test } from "bun:test"
import { stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build with includeBoardFiles does not fall back to entrypoint files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "index.circuit.tsx"), circuitCode)

  await writeFile(
    path.join(tmpDir, "package.json"),
    `{
      "name": "test-no-fallback-entrypoint",
      "version": "1.0.0",
      "dependencies": {
        "tscircuit": "latest"
      }
    }`,
  )

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["**/*.circuit.json"] }),
  )

  await runCommand(`tsci install`)
  const { stdout, exitCode } = await runCommand(`tsci build --ci`)

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Building 0 file(s)...")
  expect(stdout).toContain("Transpiling entry file...")
  await expect(
    stat(path.join(tmpDir, "dist", "index.js")),
  ).resolves.toBeTruthy()
  await expect(
    stat(path.join(tmpDir, "dist", "index", "circuit.json")),
  ).rejects.toBeTruthy()
}, 30_000)
