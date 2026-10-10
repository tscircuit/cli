import "bun-match-svg"
import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { mkdir, symlink } from "node:fs/promises"
import { join, resolve } from "node:path"
import { gunzipSync } from "node:zlib"
import {
  any_circuit_element,
  getSimulationReturnCurrentGridJsonSchema,
  simulation_pcb_return_current_result,
} from "circuit-json"
import {
  parseReturnCurrentCircuitJson,
  selectReturnCurrentExperiment,
  validatePalaceReference,
  type PalaceModel,
  type PalaceReference,
} from "simulate-return-current"
import { exportReturnCurrentCircuitJson } from "simulate-return-current/circuit-json"
import { runPalaceSimulation } from "simulate-return-current/palace"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const fixtureDirectory = join(import.meta.dir, "../../fixtures/return-current")
const resultId = "simulation_pcb_return_current_result_cli"
const runFreshEm = process.env.TSCI_RUN_RETURN_CURRENT_EM === "1"
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex")

test(runFreshEm
  ? "builds a TSX experiment, runs fresh Palace EM, and snapshots the result PCB"
  : "builds a TSX experiment, exports recorded Palace fields, and snapshots the result PCB", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  // The TSX imports the public namespace from core, using the exact installed
  // dependencies under test rather than downloading another package set.
  await symlink(
    resolve(import.meta.dir, "../../../node_modules"),
    join(tmpDir, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  )
  await Bun.write(
    join(tmpDir, "explicit-ports.circuit.tsx"),
    Bun.file(join(fixtureDirectory, "explicit-ports.circuit.tsx")),
  )
  await Bun.write(join(tmpDir, "package.json"), "{}")

  const build = await runCommand("tsci build explicit-ports.circuit.tsx")
  expect(build.exitCode).toBe(0)
  const input = parseReturnCurrentCircuitJson(
    await Bun.file(join(tmpDir, "dist/explicit-ports/circuit.json")).json(),
  )
  expect(
    input.filter((e) => e.type === "simulation_pcb_return_current_result"),
  ).toHaveLength(0)
  const selected = selectReturnCurrentExperiment({ circuitJson: input })
  expect(selected.experiment.name).toBe("Explicit GND return")
  expect(selected.excitations).toHaveLength(1)
  const excitation = selected.excitations[0]!
  expect(excitation.current).toBe(0.005)
  expect(excitation.return_source).toMatchObject({ x: 2, y: 1.5 })
  expect(excitation.return_sink).toMatchObject({ x: -2, y: 1.5 })
  expect(excitation.source_port?.resistance).toBe(25)
  expect(excitation.load_port?.resistance).toBe(100)
  expect(excitation.source_port?.reference_pcb_port_id).not.toBe(
    excitation.source_port?.signal_pcb_port_id,
  )
  expect(excitation.load_port?.reference_pcb_port_id).not.toBe(
    excitation.load_port?.signal_pcb_port_id,
  )

  const outputDirectory =
    process.env.TSCI_RETURN_CURRENT_EM_OUTPUT ?? join(tmpDir, "palace")
  let modelBytes: Uint8Array
  let referenceBytes: Uint8Array
  let solverInputBytes: Uint8Array
  if (runFreshEm) {
    // This branch is mandatory in the dedicated EM CI job. It never falls
    // back to archived fields when Python, meshing, or Palace fails.
    const run = await runPalaceSimulation({
      circuitJson: selected.solverCircuitJson,
      excitations: selected.excitations,
      frequencyHz: 1_000_000,
      sampleLayer: "bottom",
      layerSeparation: 0.8,
      copperThickness: 0.035,
      copperConductivity: 5.8e7,
      substratePermittivity: 4.3,
      substrateLossTangent: 0.02,
      copperModel: "volumetric_copper",
      meshSize: 2,
      airPadding: 2,
      order: 1,
      cellSize: 0.1,
      processes: 4,
      imageSize: 600,
      outputDirectory,
    })
    expect(run.timing.reusedCompletedFemSolve).toBe(false)
    expect(run.timing.frequencyHz).toBe(1_000_000)
    modelBytes = new Uint8Array(
      await Bun.file(join(outputDirectory, "model.json")).arrayBuffer(),
    )
    referenceBytes = new Uint8Array(
      await Bun.file(run.referencePath).arrayBuffer(),
    )
    solverInputBytes = new Uint8Array(
      await Bun.file(join(outputDirectory, "circuit.json")).arrayBuffer(),
    )
    const solverLog = await Bun.file(join(outputDirectory, "palace.log")).text()
    expect(solverLog).toContain("v0.14.0")
    expect(solverLog).toContain("GMRES solver converged")
  } else {
    // Portable regression: re-export genuine FEM samples through the public
    // simulator API. Archive hashes verify the original bytes and provenance;
    // the exporter also rejects differences in today's built PCB/terminals.
    const manifest: {
      files: Record<string, { raw_sha256: string; gzip_sha256: string }>
    } = await Bun.file(
      join(fixtureDirectory, "recorded", "manifest.json"),
    ).json()
    const recordedBytes = async (name: string) => {
      const archiveName = `${name}.gz`
      const compressed = new Uint8Array(
        await Bun.file(
          join(fixtureDirectory, "recorded", archiveName),
        ).arrayBuffer(),
      )
      expect(sha256(compressed)).toBe(manifest.files[archiveName]!.gzip_sha256)
      const raw = gunzipSync(compressed)
      expect(sha256(raw)).toBe(manifest.files[archiveName]!.raw_sha256)
      return raw
    }
    modelBytes = await recordedBytes("model.json")
    referenceBytes = await recordedBytes("reference.json")
    solverInputBytes = await recordedBytes("solver-input.circuit.json")
  }

  const model: PalaceModel = JSON.parse(new TextDecoder().decode(modelBytes))
  const reference: PalaceReference = JSON.parse(
    new TextDecoder().decode(referenceBytes),
  )
  validatePalaceReference(reference)
  expect(sha256(modelBytes)).toBe(reference.provenance.modelSha256)
  expect(sha256(solverInputBytes)).toBe(reference.provenance.circuitSha256)
  expect(reference.solver).toBe("palace")
  expect(reference.solverVersion).toBe("v0.14.0")
  expect(reference.frequencyHz).toBe(1_000_000)
  expect(reference.femOrder).toBe(1)
  expect(reference.sourceCurrents[0]!.real).toBeCloseTo(0.005, 12)
  expect(reference.sourceCurrents[0]!.imag).toBeCloseTo(0, 12)

  const output = exportReturnCurrentCircuitJson({
    circuitJson: input,
    experimentId: selected.experiment.simulation_experiment_id,
    resultId,
    simulation: { model, reference },
  })
  expect(output.slice(0, input.length)).toEqual([...input])
  const simulationRecords = output.filter((e) =>
    e.type.startsWith("simulation_"),
  )
  for (const record of simulationRecords) any_circuit_element.parse(record)
  const result = simulation_pcb_return_current_result.parse(
    output.find((e) => e.type === "simulation_pcb_return_current_result"),
  )
  expect(result).toMatchObject({
    simulation_experiment_id: selected.experiment.simulation_experiment_id,
    frequency_hz: 1_000_000,
    simulation_return_current_excitation_ids: [
      excitation.simulation_return_current_excitation_id,
    ],
  })
  const field = output.find(
    (e) => e.type === "simulation_pcb_return_current_field",
  )!
  if (field.type !== "simulation_pcb_return_current_field")
    throw new Error("Missing exported return-current field")
  expect(field).toMatchObject({
    layer: "bottom",
    field_type: "complex_phasor",
    cell_width: 0.1,
    cell_height: 0.1,
    columns: 80,
    rows: 60,
  })
  const grid = getSimulationReturnCurrentGridJsonSchema(field).parse(
    JSON.parse(
      gunzipSync(
        Buffer.from(field.field_asset.url.split(",")[1]!, "base64"),
      ).toString(),
    ),
  )
  if (grid.field_type !== "complex_phasor")
    throw new Error("EM must export complex phasors")
  for (const [channel, sampleChannel] of [
    ["sheet_current_x_real", "sheetCurrentXReal"],
    ["sheet_current_x_imag", "sheetCurrentXImag"],
    ["sheet_current_y_real", "sheetCurrentYReal"],
    ["sheet_current_y_imag", "sheetCurrentYImag"],
  ] as const) {
    const expected = Array<number | null>(field.rows * field.columns).fill(null)
    for (const sample of reference.samples) {
      const column = Math.round(
        (sample.x - field.min_x) / field.cell_width - 0.5,
      )
      const row = Math.round((sample.y - field.min_y) / field.cell_height - 0.5)
      expected[row * field.columns + column] = sample[sampleChannel]
    }
    expect(grid[channel]).toEqual(expected)
    expect(grid[channel].filter((value) => value === null)).toHaveLength(552)
  }

  await Bun.write(join(tmpDir, "result.circuit.json"), JSON.stringify(output))
  const snapshot = await runCommand(
    "tsci snapshot result.circuit.json --update --simulation-only",
  )
  expect(snapshot.exitCode).toBe(0)
  const svg = await Bun.file(
    join(
      tmpDir,
      "__snapshots__/result.circuit-simulation-return-current-explicit-gnd-return-1mhz-bottom.snap.svg",
    ),
  ).text()
  // Preserve the fresh PCB overlay even when a later assertion fails.
  if (process.env.TSCI_RETURN_CURRENT_EM_OUTPUT) {
    await mkdir(outputDirectory, { recursive: true })
    await Bun.write(
      join(outputDirectory, "result.circuit.json"),
      JSON.stringify(output),
    )
    await Bun.write(join(outputDirectory, "overlay.svg"), svg)
  }
  for (const type of [
    "simulation_pcb_return_current_heatmap",
    "simulation_pcb_return_current_vector",
    "simulation_pcb_return_current_signal",
  ]) {
    expect(svg.includes(`data-type="${type}"`)).toBe(true)
  }
  expect(svg.includes("1 MHz")).toBe(true)
  // The recorded FEM data anchors the renderer's golden image. A fresh solve
  // can generate a different unstructured mesh; its own newly created CLI
  // snapshot is checked below, without loosening the renderer's golden check.
  if (!runFreshEm) {
    await expect(svg).toMatchSvgSnapshot(
      import.meta.path,
      "return-current-1mhz",
    )
  }
  const check = await runCommand(
    "tsci snapshot result.circuit.json --simulation-only",
  )
  expect(check.exitCode).toBe(0)
  expect(check.stdout).toContain("All snapshots match")
}, 180_000)
