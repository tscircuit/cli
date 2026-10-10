import { InvalidArgumentError, Option, type Command } from "commander"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import type { CopperLayer } from "simulate-return-current"
import { loadRuntimeProjectConfig } from "lib/project-config"
import { findCircuitProjectDir } from "lib/shared/circuit-json-build-cache"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"

const positiveNumber = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new InvalidArgumentError("Must be a finite positive number")
  }
  return parsed
}

type ReturnCurrentOptions = {
  frequencyHz: number
  copperModel: "volumetric_copper" | "surface_impedance_copper"
  output: string
  resultJson?: string
  experimentId?: string
  sampleLayer: CopperLayer
  cellSize: number
  meshSize: number
  airPadding: number
  order: 1 | 2
  processes: number
  python?: string
}

export const registerReturnCurrentSimulation = (simulateCommand: Command) => {
  simulateCommand
    .command("return-current")
    .description("Run a PCB return-current EM simulation with Palace")
    .argument(
      "<file>",
      "TSX or circuit JSON containing a return-current experiment",
    )
    .requiredOption(
      "--frequency-hz <hz>",
      "Simulation frequency in Hz",
      positiveNumber,
    )
    .addOption(
      new Option("--copper-model <model>", "Conductive copper model")
        .choices(["volumetric_copper", "surface_impedance_copper"])
        .default("volumetric_copper"),
    )
    .option("--output <directory>", "Palace case directory", "return-current")
    .option(
      "--result-json <path>",
      "Result circuit JSON (default: output/circuit-result.json)",
    )
    .option(
      "--experiment-id <id>",
      "Select an experiment when the input contains several",
    )
    .option(
      "--sample-layer <layer>",
      "Reference copper layer to sample",
      "bottom",
    )
    .option(
      "--cell-size <mm>",
      "Current sampling pitch in mm",
      positiveNumber,
      0.1,
    )
    .option("--mesh-size <mm>", "FEM mesh target in mm", positiveNumber, 2)
    .option("--air-padding <mm>", "Air domain padding in mm", positiveNumber, 2)
    .option(
      "--order <order>",
      "FEM order: 1 or 2",
      (value) => {
        if (value !== "1" && value !== "2") {
          throw new InvalidArgumentError("FEM order must be 1 or 2")
        }
        return Number(value) as 1 | 2
      },
      1,
    )
    .option(
      "--processes <count>",
      "MPI processes",
      (value) => {
        const parsed = positiveNumber(value)
        if (!Number.isInteger(parsed)) {
          throw new InvalidArgumentError("MPI processes must be an integer")
        }
        return parsed
      },
      1,
    )
    .option("--python <path>", "Python with Gmsh/VTK (or PALACE_PYTHON)")
    .action(async (file: string, options: ReturnCurrentOptions) => {
      const { parseReturnCurrentCircuitJson, selectReturnCurrentExperiment } =
        await import("simulate-return-current")
      const { runPalaceSimulation } = await import(
        "simulate-return-current/palace"
      )
      const { exportReturnCurrentCircuitJson } = await import(
        "simulate-return-current/circuit-json"
      )

      let input: unknown
      if (file.endsWith(".json")) {
        input = JSON.parse(await readFile(resolve(file), "utf8"))
      } else {
        const projectDir = findCircuitProjectDir(file)
        const config = await loadRuntimeProjectConfig(projectDir)
        const generated = await getOrGenerateCircuitJson({
          filePath: file,
          projectDir,
          saveToFile: false,
          platformConfig: getPlatformConfigWithCliDefaults(
            config?.platformConfig,
            {
              projectDir,
            },
          ),
        })
        input = generated.circuitJson
      }
      const circuitJson = parseReturnCurrentCircuitJson(input)
      const selected = selectReturnCurrentExperiment({
        circuitJson,
        experimentId: options.experimentId,
      })
      const run = await runPalaceSimulation({
        circuitJson: selected.solverCircuitJson,
        excitations: selected.excitations,
        frequencyHz: options.frequencyHz,
        copperModel: options.copperModel,
        sampleLayer: options.sampleLayer,
        cellSize: options.cellSize,
        meshSize: options.meshSize,
        airPadding: options.airPadding,
        order: options.order,
        processes: options.processes,
        python: options.python,
        imageSize: 600,
        outputDirectory: resolve(options.output),
      })
      const result = exportReturnCurrentCircuitJson({
        circuitJson,
        experimentId: selected.experiment.simulation_experiment_id,
        simulation: {
          model: JSON.parse(
            await readFile(join(run.outputDirectory, "model.json"), "utf8"),
          ),
          reference: JSON.parse(await readFile(run.referencePath, "utf8")),
        },
      })
      const resultPath = resolve(
        options.resultJson ?? join(run.outputDirectory, "circuit-result.json"),
      )
      await mkdir(dirname(resultPath), { recursive: true })
      await writeFile(resultPath, JSON.stringify(result, null, 2))
      console.log(`Circuit JSON simulation result: ${resultPath}`)
    })
}
