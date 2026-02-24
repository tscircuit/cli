import { expect, test } from "bun:test"
import { stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const invalidCircuitCode = `
import {SmdUsbC} from "@tsci/seveibar.smd-usb-c"
export default () => (
  <board width="10mm" height="10mm">
    <SmdUsbC name="USBC" />
  </board>
)`

const validCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build fails fast on first fatal circuit generation error", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(
    path.join(tmpDir, "01-invalid.circuit.tsx"),
    invalidCircuitCode,
  )
  await writeFile(path.join(tmpDir, "02-valid.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stderr } = await runCommand("tsci build --ci")

  expect(exitCode).toBe(1)
  expect(stderr).toContain("circuit_generation_failed")

  const validCircuitOutputExists = await stat(
    path.join(tmpDir, "dist", "02-valid", "circuit.json"),
  )
    .then(() => true)
    .catch(() => false)

  expect(validCircuitOutputExists).toBe(false)
}, 60_000)
