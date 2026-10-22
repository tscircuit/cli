import { expect, test } from "bun:test"
import { join } from "node:path"
import {
  getPcbSpiceFixture,
  readPcbSpiceReceipt,
  runPcbSpiceCli,
} from "tests/fixtures/pcb-spice"

test("analog dispatches native pcb_spice TSX and writes the completed report", async () => {
  const cwd = await getPcbSpiceFixture()
  const outputDir = join(cwd, "report with spaces")
  const result = await runPcbSpiceCli({
    cwd,
    args: ["entry.tsx", "--output", outputDir],
  })
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe("")
  expect(result.stdout).toContain(join(outputDir, "results.html"))
  expect(result.stdout).not.toContain("Index  time")
  expect(await Bun.file(join(outputDir, "results.html")).text()).toContain(
    "Test report",
  )

  const receipt = await readPcbSpiceReceipt(outputDir)
  expect(receipt.project.root).toBe(cwd)
  expect(receipt.modeling.description).toBe("CLI native declarations")
  expect(receipt.circuitJson.map((record) => record.type)).toEqual(
    expect.arrayContaining([
      "simulation_experiment",
      "simulation_ibis_model",
      "simulation_ibis_pin_state",
      "simulation_digital_stimulus",
      "simulation_eye_diagram",
      "simulation_voltage_probe",
    ]),
  )
  expect(
    receipt.circuitJson.find(
      (record) => record.type === "simulation_experiment",
    )?.spice_engine,
  ).toBe("pcb_spice")
}, 30000)
