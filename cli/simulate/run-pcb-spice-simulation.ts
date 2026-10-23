import { stat } from "node:fs/promises"
import { resolve } from "node:path"
import {
  runPipeline,
  type PipelineModeling,
} from "@tscircuit/pcb-spice-pipeline"
import {
  createNativeSolver,
  loadIbisSources,
  writePipelineOutput,
} from "@tscircuit/pcb-spice-pipeline/node"
import type { AnyCircuitElement } from "circuit-json"

export const runPcbSpiceSimulation = async ({
  circuitJson,
  modeling,
  output,
  baseDir,
}: {
  circuitJson: AnyCircuitElement[]
  modeling?: PipelineModeling
  output?: string
  baseDir: string
}) => {
  const outputDir = resolve(output ?? `runs/simulation-${Date.now()}`)
  try {
    await stat(outputDir)
    throw new Error(`Use a fresh output directory: ${outputDir}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  const result = await runPipeline({
    circuitJson,
    modeling,
    ibisSources: await loadIbisSources({ circuitJson, baseDir }),
    runSolver: createNativeSolver(),
  })
  await writePipelineOutput({ result, outputDir })
  console.log(`Simulation results written to ${outputDir}`)
  return result
}
