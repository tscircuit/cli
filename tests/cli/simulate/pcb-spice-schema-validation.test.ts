import { expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pcb_quote_estimate } from "circuit-json"
import { runPcbSpiceSimulation } from "cli/simulate/run-pcb-spice-simulation"

test("PCB simulation retains validation for records from newer Circuit JSON", async () => {
  const projectDir = await mkdtemp(join(tmpdir(), "tsci-pcb-spice-schema-"))
  const output = join(projectDir, "output")
  const quote = pcb_quote_estimate.parse({
    type: "pcb_quote_estimate",
    pcb_board_id: "board",
    supplier_name: "test supplier",
    currency: "USD",
    quantity: 1,
    estimated_at: "2026-11-02T00:00:00Z",
    is_manufacturing_cost_complete: false,
    is_landed_cost_complete: false,
  })
  try {
    await expect(
      runPcbSpiceSimulation({
        file: join(projectDir, "board.circuit.json"),
        projectDir,
        circuitJson: [quote],
        baseDir: projectDir,
        output,
        modeling: {
          reduction: "routed-copper",
          sections: 1,
          lanes: [
            {
              port: "signal",
              from: { sourcePortId: "driver" },
              to: { sourcePortId: "receiver" },
            },
          ],
          extraction: {
            minimumHz: 1e6,
            maximumHz: 1e9,
            modelHz: 1e8,
            filaments: 1,
            refinementFilaments: 2,
            convergenceTolerance: 0.1,
            capTolerance: 0.1,
            maxPanelLengthMm: 1,
            reciprocityTolerance: 0.1,
            dcResistanceTolerance: 0.1,
            groundMeshMm: 1,
          },
        },
      }),
    ).rejects.toThrow(/pcb_quote_estimate.*no registered record schema/)
    expect(await Bun.file(join(output, "report.html")).exists()).toBe(false)
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
})
