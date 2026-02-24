import { expect, test } from "bun:test"
import { stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const packageJson = JSON.stringify({
  name: "test-build-concurrency-fail-fast",
  dependencies: {
    react: "*",
    tscircuit: "*",
  },
})

const validCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

const invalidCircuitCode = `
export default () => {
  throw new Error("intentional fatal error")
}`

test("build with --concurrency stops queueing after first fatal error", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(
    path.join(tmpDir, "01-invalid.circuit.tsx"),
    invalidCircuitCode,
  )
  await writeFile(path.join(tmpDir, "02-valid.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "03-valid.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "package.json"), packageJson)

  const { exitCode, stderr } = await runCommand(
    "tsci build --ci --concurrency 2",
  )

  expect(exitCode).toBe(1)
  expect(stderr).toContain("circuit_generation_failed")

  const thirdOutputExists = await stat(
    path.join(tmpDir, "dist", "03-valid", "circuit.json"),
  )
    .then(() => true)
    .catch(() => false)

  expect(thirdOutputExists).toBe(false)
}, 60_000)
