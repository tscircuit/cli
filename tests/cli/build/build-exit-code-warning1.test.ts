import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitWithWarning = JSON.stringify([
  {
    type: "source_component",
    source_component_id: "sc1",
    name: "R1",
    ftype: "simple_resistor",
  },
  {
    type: "pcb_placement_warning",
    message: "Component R1 placed near board edge",
  },
])

test("build exits with code 2 when circuit JSON has warnings but no errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "circuit.json"), circuitWithWarning)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand("tsci build circuit.json")

  expect(exitCode).toBe(2)
  expect(stdout).toContain("Build completed with warnings")
}, 30_000)
