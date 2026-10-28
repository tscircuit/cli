import { stat } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
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
  file,
  projectDir,
  circuitJson,
  modeling,
  output,
  solverTimeoutMs,
  baseDir,
}: {
  file: string
  projectDir: string
  circuitJson: AnyCircuitElement[]
  modeling?: PipelineModeling
  output?: string
  solverTimeoutMs?: number
  baseDir: string
}) => {
  const name = relative(projectDir, resolve(file))
    .replace(/(?:\.(?:board|circuit))?\.(?:[jt]sx?|json(?:\.gz)?)$/i, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .slice(0, 120)
  const outputDir = resolve(
    output ??
      join(
        projectDir,
        ".tscircuit",
        `simulation-${name || "circuit"}-${Date.now()}`,
      ),
  )
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
    runSolver: createNativeSolver({ timeoutMs: solverTimeoutMs }),
  })
  await writePipelineOutput({ result, outputDir })
  console.log(`Simulation results written to ${outputDir}`)
  return result
}
