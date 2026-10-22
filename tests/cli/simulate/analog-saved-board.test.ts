import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildFile } from "cli/build/build-file"
import { loadAnalogInput } from "cli/simulate/load-analog-input"
import { RootCircuit } from "tscircuit"
import { createElement as h } from "react"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { getSourceFilesystemMd5Hash } from "lib/shared/circuit-json-build-cache"

test("build and cached analog preserve complete routed saved records and simulation pin references", async () => {
  const projectDir = await mkdtemp(join(tmpdir(), "analog-saved-"))
  try {
    await symlink(
      join(process.cwd(), "node_modules"),
      join(projectDir, "node_modules"),
    )
    await writeFile(join(projectDir, "package.json"), "{}")
    const platform = {
      partsEngineDisabled: true,
      schematicDisabled: true,
      routingDisabled: false,
    }
    const source = new RootCircuit({ platform })
    source.add(
      h(
        "board",
        { width: 10, height: 6, schematicDisabled: true },
        ...[-2, 2].map((x, i) =>
          h("chip", {
            key: i,
            name: i ? "RX" : "TX",
            pcbX: x,
            pinLabels: { pin1: "DATA", pin2: "GND" },
            footprint: h(
              "footprint",
              null,
              h("smtpad", {
                portHints: ["pin1"],
                width: 0.5,
                height: 0.5,
                shape: "rect",
              }),
              h("smtpad", {
                portHints: ["pin2"],
                pcbY: 1,
                width: 0.5,
                height: 0.5,
                shape: "rect",
              }),
            ),
          }),
        ),
        h("trace", {
          from: ".TX > .DATA",
          to: ".RX > .DATA",
          pcbPathRelativeTo: ".TX > .DATA",
          pcbPath: [
            { x: 0, y: 0 },
            { x: 4, y: 0 },
          ],
        }),
      ),
    )
    await source.renderUntilSettled()
    const generated = { circuitJson: source.getCircuitJson() }
    const ids = new Map<string, string>()
    for (const record of generated.circuitJson) {
      for (const [key, value] of Object.entries(record)) {
        if (key.endsWith("_id") && typeof value === "string")
          ids.set(value, `saved_${value}`)
      }
    }
    const remap = (value: any): any =>
      typeof value === "string"
        ? (ids.get(value) ?? value)
        : Array.isArray(value)
          ? value.map(remap)
          : value && typeof value === "object"
            ? Object.fromEntries(
                Object.entries(value).map(([key, item]) => [key, remap(item)]),
              )
            : value
    const physical = remap(
      generated.circuitJson.filter(
        (record) => record.type !== "source_project_metadata",
      ),
    )
    physical.find((record: any) => record.type === "source_component").ftype =
      "simple_crystal"
    const board = physical.find((record: any) => record.type === "pcb_board")
    physical.push({
      type: "pcb_stackup",
      pcb_stackup_id: "saved_stackup",
      pcb_board_id: board.pcb_board_id,
      layers: [
        { layer_type: "copper", layer: "top", thickness: 0.035 },
        {
          layer_type: "dielectric",
          thickness: 1.53,
          relative_permittivity: 4.1,
        },
        { layer_type: "copper", layer: "bottom", thickness: 0.035 },
      ],
    })
    const trace = physical.find((record: any) => record.type === "pcb_trace")
    expect(trace.route.length).toBeGreaterThanOrEqual(2)
    expect(trace.route[0].start_pcb_port_id).toBeDefined()
    expect(trace.route.at(-1).end_pcb_port_id).toBeDefined()
    await writeFile(
      join(projectDir, "saved.circuit.json"),
      JSON.stringify(physical),
    )
    const file = join(projectDir, "main.circuit.tsx")
    await writeFile(
      file,
      `import { ImportedBoard } from "@tscircuit/pcb-spice-pipeline/tsx"
import { analog } from "@tscircuit/core"
import saved from "./saved.circuit.json"
export const modeling = { description: "saved route" }
export default () => <ImportedBoard circuitJson={saved}>
  <ibismodel componentRef=".TX" ibisModelAsset={{ project_relative_path: "models/test.ibs", url: "./models/test.ibs", mimetype: "text/plain" }}
    ibisComponentName="TEST" ibisPinNameToPortLabel={{ "1": "DATA", "2": "GND" }} modelValueCorner="typical" includePackageParasitics={false} />
  <analog.transientsimulation name="SI" duration="100ns" timePerStep="10ps" spiceEngine="pcb_spice" ibisPinStates={{ ".TX > .DATA": { isOutput: true, isOutputEnabled: true } }} />
  <voltageprobe name="RX" connectsTo=".RX > .DATA" referenceTo=".RX > .GND" />
</ImportedBoard>`,
    )
    const output = join(projectDir, "dist", "main", "circuit.json")
    expect(
      (await buildFile(file, output, projectDir, { platformConfig: platform }))
        .ok,
    ).toBe(true)
    const built = JSON.parse(await readFile(output, "utf8"))
    expect(built.slice(0, physical.length)).toEqual(physical)
    const dataPort = (name: string) => {
      const component = physical.find(
        (record: any) =>
          record.type === "source_component" && record.name === name,
      )
      return physical.find(
        (record: any) =>
          record.type === "source_port" &&
          record.source_component_id === component.source_component_id &&
          record.name === "DATA",
      ).source_port_id
    }
    const model = built.find(
      (record: any) => record.type === "simulation_ibis_model",
    )
    expect(model.ibis_pin_name_to_source_port_id["1"]).toBe(dataPort("TX"))
    expect(
      built.find((record: any) => record.type === "simulation_voltage_probe")
        .signal_input_source_port_id,
    ).toBe(dataPort("RX"))
    expect(
      built.find((record: any) => record.type === "simulation_ibis_pin_state")
        .source_port_id,
    ).toBe(dataPort("TX"))
    const cached = await loadAnalogInput({
      file,
      projectDir,
      platformConfig: getPlatformConfigWithCliDefaults(platform, {
        projectDir,
      }),
    })
    expect("cacheHit" in cached && cached.cacheHit).toBe(true)
    expect(cached.circuitJson).toEqual(built)
    const hash = getSourceFilesystemMd5Hash(file)
    await writeFile(
      join(projectDir, "saved.circuit.json"),
      JSON.stringify([
        ...physical,
        { type: "source_project_metadata", name: "updated saved input" },
      ]),
    )
    expect(getSourceFilesystemMd5Hash(file)).not.toBe(hash)
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
}, 30_000)
