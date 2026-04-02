import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitWithMultipleErrors = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={8} />
    <resistor resistance="1k" footprint="0402" name="R2" schX={3} pcbX={-10} />
  </board>
)`

test("build fails with multiple errors and shows them in output", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(
    path.join(tmpDir, "test.circuit.tsx"),
    circuitWithMultipleErrors,
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout, stderr } = await runCommand("tsci build")

  expect(exitCode).toBe(1)
  expect(stdout + stderr).toMatchInlineSnapshot(`
    "Building 1 file(s)...
    Building test.circuit.tsx...
    Generating circuit JSON...
    Circuit JSON written to dist/test/circuit.json
    Port pin1 on R1 is missing a trace
    Port pin1 on R1 is missing a trace
    Port pin2 on R1 is missing a trace
    Port pin2 on R1 is missing a trace
    Port pin1 on R2 is missing a trace
    Port pin1 on R2 is missing a trace
    Port pin2 on R2 is missing a trace
    Port pin2 on R2 is missing a trace

    Build complete
      Circuits  0 passed 1 with errors
      Output    dist

    ⚠ Build completed with errors
    Component R1 extends outside board boundaries by 3mm. Try moving it 3.78mm left to fit within the board edge.
    Component R1 extends outside board boundaries by 3mm. Try moving it 3.78mm left to fit within the board edge.
    Component R2 extends outside board boundaries by 5mm. Try moving it 5.78mm right to fit within the board edge.
    Component R2 extends outside board boundaries by 5mm. Try moving it 5.78mm right to fit within the board edge.
    Build exiting with code 1: circuit build errors occurred
    "
  `)
}, 30_000)
