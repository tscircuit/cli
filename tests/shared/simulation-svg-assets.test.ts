import { expect, test } from "bun:test"
import fs from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { gzipSync } from "node:zlib"
import {
  type AnyCircuitElement,
  type LayerRef,
  simulation_pcb_return_current_field,
} from "circuit-json"
import { EMPTY_IMAGE_FORMAT_SELECTION } from "cli/build/image-format-selection"
import { writeSimulationSvgAssetsFromCircuitJson } from "cli/build/worker-output-generators"
import { processSnapshotFile } from "lib/shared/process-snapshot-file"
import { getSimulationSvgAssetsFromCircuitJson } from "lib/shared/simulation-svg-assets"

test("simulation SVG assets are separated and receive collision-safe names", async () => {
  const circuitJson = ["Root", "Root", "Root-2", "Group"].flatMap(
    (name, index) => {
      const simulationExperimentId = `simulation_experiment_${index}`
      return [
        {
          type: "simulation_experiment",
          simulation_experiment_id: simulationExperimentId,
          name,
          experiment_type: "spice_transient_analysis",
          time_per_step: 0.5,
          start_time_ms: 0,
          end_time_ms: 1,
        },
        {
          type: "simulation_transient_voltage_graph",
          simulation_transient_voltage_graph_id: `simulation_transient_voltage_graph_${index}`,
          simulation_experiment_id: simulationExperimentId,
          voltage_levels: [0, index + 1, 0],
          time_per_step: 0.5,
          start_time_ms: 0,
          end_time_ms: 1,
          name,
        },
      ]
    },
  ) as AnyCircuitElement[]

  const assets = await getSimulationSvgAssetsFromCircuitJson(circuitJson)

  expect(assets.map((asset) => asset.fileNameSuffix)).toEqual([
    "root",
    "root-2",
    "root-2-2",
    "group",
  ])
  for (const [index, asset] of assets.entries()) {
    expect(asset.simulationSvg).toContain(
      `data-simulation-experiment-id="simulation_experiment_${index}"`,
    )
    expect(asset.simulationSvg).toContain(
      `data-simulation-transient-voltage-graph-id="simulation_transient_voltage_graph_${index}"`,
    )
  }
})

const returnCurrentExperiment = {
  type: "simulation_experiment",
  simulation_experiment_id: "return-experiment",
  name: "Processor escape",
  experiment_type: "pcb_return_current",
} as const

const createReturnCurrentCircuit = (
  definitions: Array<{
    resultId: string
    frequencyHz: number
    layers: LayerRef[]
  }>,
): AnyCircuitElement[] => [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 6,
    height: 4,
    material: "fr4",
    num_layers: 4,
    thickness: 1.6,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "signal",
    route: [
      { route_type: "wire", x: -1, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "top" },
    ],
  },
  {
    type: "pcb_port",
    pcb_port_id: "ground-pad",
    source_port_id: "ground-source-port",
    x: 1,
    y: 1,
    layers: ["top"],
  },
  returnCurrentExperiment,
  {
    type: "simulation_return_current_excitation",
    simulation_return_current_excitation_id: "excitation",
    simulation_experiment_id: "return-experiment",
    pcb_trace_id: "signal",
    ground_source_net_id: "ground",
    current: 0.005,
    return_source: {
      contact_type: "pcb_port",
      pcb_port_id: "ground-pad",
      x: 1,
      y: 1,
      layer: "top",
    },
    return_sink: {
      contact_type: "pcb_port",
      pcb_port_id: "ground-pad",
      x: 1,
      y: 1,
      layer: "top",
    },
  },
  ...definitions.flatMap(
    ({ resultId, frequencyHz, layers }): AnyCircuitElement[] => [
      {
        type: "simulation_pcb_return_current_result",
        simulation_pcb_return_current_result_id: resultId,
        simulation_experiment_id: "return-experiment",
        pcb_board_id: "board",
        simulation_return_current_excitation_ids: ["excitation"],
        frequency_hz: frequencyHz,
      },
      ...layers.map(
        (layer): AnyCircuitElement => ({
          type: "simulation_pcb_return_current_field",
          simulation_pcb_return_current_field_id: `${resultId}-${layer}`,
          simulation_pcb_return_current_result_id: resultId,
          layer,
          source_net_id: "ground",
          field_type: "complex_phasor",
          min_x: -1,
          min_y: 0,
          columns: 2,
          rows: 1,
          cell_width: 1,
          cell_height: 1,
          copper_thickness: 0.035,
          data_format: "simulation_return_current_grid_json_v1",
          field_asset: {
            project_relative_path: `${resultId}-${layer}.json.gz`,
            mimetype: "application/gzip",
            url: `data:application/gzip;base64,${gzipSync(
              JSON.stringify({
                field_type: "complex_phasor",
                sheet_current_x_real: [0.002, null],
                sheet_current_x_imag: [0.001, null],
                sheet_current_y_real: [0, null],
                sheet_current_y_imag: [0, null],
              }),
            ).toString("base64")}`,
          },
        }),
      ),
    ],
  ),
]

test("pending return-current experiments produce no SVG assets", async () => {
  expect(
    await getSimulationSvgAssetsFromCircuitJson([returnCurrentExperiment]),
  ).toEqual([])
})

test("return-current SVGs include every result, frequency and layer with stable collision-safe names", async () => {
  const circuitJson = createReturnCurrentCircuit([
    {
      resultId: "result-400",
      frequencyHz: 400e6,
      layers: ["inner1", "inner2"],
    },
    { resultId: "result-1000", frequencyHz: 1e9, layers: ["inner2"] },
    { resultId: "result-4000", frequencyHz: 4e9, layers: ["inner1"] },
    { resultId: "result-repeat", frequencyHz: 400e6, layers: ["inner1"] },
  ])
  circuitJson.push(
    {
      type: "simulation_experiment",
      simulation_experiment_id: "spice-experiment",
      name: "Return current Processor escape 400MHz inner1",
      experiment_type: "spice_transient_analysis",
      time_per_step: 0.5,
      start_time_ms: 0,
      end_time_ms: 1,
    },
    {
      type: "simulation_transient_voltage_graph",
      simulation_transient_voltage_graph_id: "spice-voltage",
      simulation_experiment_id: "spice-experiment",
      voltage_levels: [0, 1, 0],
      time_per_step: 0.5,
      start_time_ms: 0,
      end_time_ms: 1,
      name: "Signal voltage",
    },
  )

  const assets = await getSimulationSvgAssetsFromCircuitJson(circuitJson)
  expect(assets.map((asset) => asset.fileNameSuffix)).toEqual([
    "return-current-processor-escape-400mhz-inner1",
    "return-current-processor-escape-400mhz-inner1-2",
    "return-current-processor-escape-400mhz-inner2",
    "return-current-processor-escape-1ghz-inner2",
    "return-current-processor-escape-4ghz-inner1",
    "return-current-processor-escape-400mhz-inner1-3",
  ])
  expect(assets[0]!.kind).toBe("spice")
  expect(assets[0]!.schematicSimulationSvg).toContain("<svg")
  for (const asset of assets.slice(1)) {
    expect(asset.kind).toBe("pcb-return-current")
    if (asset.kind !== "pcb-return-current")
      throw new Error("Expected PCB asset")
    expect(asset.schematicSimulationSvg).toBeUndefined()
    expect(asset.simulationSvg).toContain(
      `data-simulation-result-id="${asset.simulationResultId}"`,
    )
    expect(asset.simulationSvg).toContain(`data-pcb-layer="${asset.layer}"`)
    expect(asset.simulationSvg).toContain('data-pcb-trace-id="signal"')
    expect(asset.simulationSvg).toContain(
      'data-arrow-reference="excitation-current-peak"',
    )
    expect(asset.simulationSvg).not.toContain("data-circuit-to-svg-version")
    expect(
      asset.simulationSvg.match(
        /data-type="simulation_pcb_return_current_cell"/g,
      ),
    ).toHaveLength(1)
  }
})

test("completed return-current results with missing data or dangling experiment references fail", async () => {
  const circuitJson = createReturnCurrentCircuit([
    { resultId: "result-400", frequencyHz: 400e6, layers: ["inner1"] },
  ])
  await expect(
    getSimulationSvgAssetsFromCircuitJson(
      circuitJson.filter((element) => element.type !== "simulation_experiment"),
    ),
  ).rejects.toThrow("Missing PCB return-current experiment")
  await expect(
    getSimulationSvgAssetsFromCircuitJson(
      circuitJson.filter(
        (element) => element.type !== "simulation_pcb_return_current_field",
      ),
    ),
  ).rejects.toThrow(
    'Return-current result "result-400" has no field or heatmap layers',
  )
  await expect(
    getSimulationSvgAssetsFromCircuitJson(
      circuitJson.filter(
        (element) => element.type !== "simulation_pcb_return_current_result",
      ),
    ),
  ).rejects.toThrow(
    'Return-current overlay references missing result "result-400"',
  )
})

test("malformed embedded return-current grids fail instead of creating empty SVGs", async () => {
  const circuitJson = createReturnCurrentCircuit([
    { resultId: "result-400", frequencyHz: 400e6, layers: ["inner1"] },
  ])
  const field = circuitJson.find(
    (element) => element.type === "simulation_pcb_return_current_field",
  )!
  if (field.type !== "simulation_pcb_return_current_field") {
    throw new Error("Expected current field")
  }
  field.columns = 3
  await expect(
    getSimulationSvgAssetsFromCircuitJson(circuitJson),
  ).rejects.toThrow("Each current channel must have 3 entries")
})

const createExternalFieldCircuit = () => {
  const circuitJson = createReturnCurrentCircuit([
    { resultId: "external-result", frequencyHz: 400e6, layers: ["inner1"] },
  ])
  const field = circuitJson.find(
    (element) => element.type === "simulation_pcb_return_current_field",
  )!
  if (field.type !== "simulation_pcb_return_current_field") {
    throw new Error("Expected current field")
  }
  field.field_asset.url = "https://example.com/return-current.json.gz"
  simulation_pcb_return_current_field.parse(field)
  return circuitJson
}

test("PCB and schematic snapshots skip unrelated external simulation fields while explicit simulation snapshots report unsupported assets", async () => {
  const projectDir = fs.mkdtempSync(
    path.join(tmpdir(), "return-current-snapshot-"),
  )
  try {
    const file = path.join(projectDir, "external.circuit.json")
    fs.writeFileSync(file, JSON.stringify(createExternalFieldCircuit()))
    const options = {
      file,
      projectDir,
      update: true,
      threeD: false,
      pcbOnly: false,
      schematicOnly: false,
      simulationOnly: false,
      forceUpdate: false,
      createDiff: false,
    }

    for (const type of ["pcb", "schematic"] as const) {
      const result = await processSnapshotFile({
        ...options,
        pcbOnly: type === "pcb",
        schematicOnly: type === "schematic",
      })
      expect(result.ok).toBe(true)
      expect(result.errorMessage).toBeUndefined()
      expect(result.successPaths).toEqual([
        `__snapshots__/external.circuit-${type}.snap.svg`,
      ])
      expect(
        fs.readFileSync(path.join(projectDir, result.successPaths[0]!), "utf8"),
      ).not.toContain("data-simulation-result-id=")
    }

    const simulationResult = await processSnapshotFile({
      ...options,
      simulationOnly: true,
    })
    expect(simulationResult.ok).toBe(false)
    expect(simulationResult.errorMessage).toContain("requires resolveAsset")
    expect(simulationResult.successPaths).toEqual([])
    expect(fs.readdirSync(path.join(projectDir, "__snapshots__"))).toHaveLength(
      2,
    )
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("builds skip external PCB simulation fields when no PCB simulation SVG is requested", async () => {
  const outputDir = fs.mkdtempSync(path.join(tmpdir(), "return-current-build-"))
  try {
    const circuitJson = createExternalFieldCircuit()
    expect(
      await writeSimulationSvgAssetsFromCircuitJson(
        circuitJson,
        outputDir,
        EMPTY_IMAGE_FORMAT_SELECTION,
      ),
    ).toBe(false)
    expect(
      await writeSimulationSvgAssetsFromCircuitJson(circuitJson, outputDir, {
        ...EMPTY_IMAGE_FORMAT_SELECTION,
        simulationSchematicSvgs: true,
      }),
    ).toBe(false)
    expect(fs.readdirSync(outputDir)).toEqual([])
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true })
  }
})
