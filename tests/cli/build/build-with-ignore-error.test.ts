import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
import {SmdUsbC} from "@tsci/seveibar.smd-usb-c"
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
    <SmdUsbC name="USBC" />
  </board>
)`

test("build with --ignore-errors fails for fatal errors (circuit_generation_failed)", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "index.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  // Fatal errors like circuit_generation_failed should cause exit code 1
  // even when --ignore-errors is passed
  const { exitCode, stderr } = await runCommand(`tsci build --ignore-errors`)
  expect(exitCode).toBe(1)
  expect(stderr).toContain("error")
}, 30_000)
