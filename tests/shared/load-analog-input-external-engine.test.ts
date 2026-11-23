import { expect, mock, test } from "bun:test"
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { loadAnalogInput } from "../../cli/simulate/load-analog-input"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"

test.failing(
  "loading native CLI simulation input retains the declaration without running a render-time backend",
  async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tsci-external-input-"))
    const simulate = mock(async () => ({ simulationResultCircuitJson: [] }))
    try {
      await symlink(
        path.resolve("node_modules"),
        path.join(dir, "node_modules"),
        "dir",
      )
      const file = path.join(dir, "board.circuit.tsx")
      await writeFile(
        file,
        `import { analog } from "@tscircuit/core"
export default () => <board width={10} height={10} routingDisabled schematicDisabled>
<analog.transientsimulation name="Native" spiceEngine="pcb_spice" duration="1ns" timePerStep="10ps" />
</board>`,
      )
      const input = await loadAnalogInput({
        file,
        projectDir: dir,
        platformConfig: getPlatformConfigWithCliDefaults(
          {
            partsEngineDisabled: true,
            spiceEngineMap: { pcb_spice: { simulate } },
          },
          { projectDir: dir },
        ),
      })
      expect(
        input.circuitJson.find((e) => e.type === "simulation_experiment"),
      ).toMatchObject({ spice_engine: "pcb_spice" })
      expect(simulate).not.toHaveBeenCalled()
      expect(
        input.circuitJson.filter((e) => e.type === "simulation_voltage_graph"),
      ).toEqual([])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  },
)
