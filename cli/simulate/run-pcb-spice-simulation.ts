import { readFile, stat } from "node:fs/promises"
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
  if (!modeling) {
    throw new Error(
      "pcb_spice requires explicit modeling: export modeling or use --modeling <file>",
    )
  }
  const outputDir = resolve(output ?? `runs/simulation-${Date.now()}`)
  try {
    await stat(outputDir)
    throw new Error(`Use a fresh output directory: ${outputDir}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  const tools = process.env.PCB_SPICE_TOOLS
    ? JSON.parse(await readFile(resolve(process.env.PCB_SPICE_TOOLS), "utf8"))
    : undefined
  const result = await runPipeline({
    circuitJson,
    modeling,
    ibisSources: await loadIbisSources({ circuitJson, baseDir }),
    runSolver: createNativeSolver({ tools }),
  })
  await writePipelineOutput({ result, outputDir })
  console.log(`Simulation results written to ${outputDir}`)
  return result
}
