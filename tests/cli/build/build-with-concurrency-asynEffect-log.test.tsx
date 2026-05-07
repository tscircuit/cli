import { expect, test } from "bun:test"
import { stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={-3} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" schX={3} pcbX={3} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)`

test("build with --ci logs running async effect names to stdout in the worker heartbeat log messages", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const indexCircuitPath = path.join(tmpDir, "index.circuit.tsx")
  await writeFile(indexCircuitPath, circuitCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ dependencies: { react: "^19.2.0" } }, null, 2),
  )
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "./index.circuit.tsx",
      build: { glbs: true, previewImages: true },
    }),
  )

  const { stdout } = await runCommand(`tsci build --ci --concurrency 2`)

  // worker heartbeat log messages timeout is 30s so this check is not valid anymore
  expect(stdout).not.toContain("status=waiting on get-supplier-part-numbers…")
}, 60_000)
