import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitWithError = JSON.stringify([
  {
    type: "source_component",
    source_component_id: "sc1",
    name: "R1",
    ftype: "simple_resistor",
  },
  {
    type: "pcb_component_outside_board_error",
    message: "Component R1 extends outside board boundaries",
  },
])

test("build exits with code 0 when errors present but --ignore-errors is set", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "circuit.json"), circuitWithError)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand(
    "tsci build circuit.json --ignore-errors",
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Done")
}, 30_000)
