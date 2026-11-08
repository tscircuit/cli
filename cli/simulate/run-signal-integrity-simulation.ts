import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join, relative, resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"

export const runSignalIntegritySimulation = async ({
  file,
  projectDir,
  circuitJson,
  output,
}: {
  file: string
  projectDir: string
  circuitJson: AnyCircuitElement[]
  output?: string
}) => {
  const { runPipeline } = await import("@tscircuit/signal-integrity-pipeline")
  const { loadIbisSources, createNativeSolver, writePipelineOutput } =
    await import("@tscircuit/signal-integrity-pipeline/node")
  const result = await runPipeline({
    circuitJson,
    ibisSources: await loadIbisSources({ circuitJson, baseDir: projectDir }),
    runSolver: createNativeSolver(),
  })
  const results = result.blocks.flatMap((block) => block.results)
  if (results.length === 0) return results

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
  await mkdir(dirname(outputDir), { recursive: true })
  const stagedDir = await mkdtemp(
    join(dirname(outputDir), `.${basename(outputDir)}-`),
  )
  const previousDir = `${stagedDir}.previous`
  let replaced = false
  try {
    await writePipelineOutput({ result, outputDir: stagedDir })
    await writeFile(
      join(stagedDir, "results.circuit.json"),
      JSON.stringify(result.simulationResultCircuitJson, null, 2),
    )
    try {
      await rename(outputDir, previousDir)
      replaced = true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
    try {
      await rename(stagedDir, outputDir)
    } catch (error) {
      if (replaced) await rename(previousDir, outputDir)
      throw error
    }
  } finally {
    await rm(stagedDir, { recursive: true, force: true })
  }
  if (replaced) await rm(previousDir, { recursive: true, force: true })

  for (const block of result.blocks) {
    console.log(`Signal integrity: ${block.name}`)
    for (const signal of circuitJson) {
      if (
        signal.type !== "simulation_signal" ||
        signal.simulation_signal_integrity_id !==
          block.simulationSignalIntegrityId
      )
        continue
      console.log(`  ${signal.name}`)
      for (const result of block.results) {
        if (
          !("simulation_signal_id" in result) ||
          result.simulation_signal_id !== signal.simulation_signal_id
        )
          continue
        const value = (n: number, unit: string) => `${n.toPrecision(4)} ${unit}`
        if (result.type === "simulation_signal_eye") {
          console.log(
            `    ${result.source_port_id}: eye height ${value(result.eye_height_v, "V")}, eye width ${value(result.eye_width_s, "s")}, mask margin ${value(result.mask_margin_v, "V")}`,
          )
        } else if (result.type === "simulation_signal_crosstalk") {
          console.log(
            `    ${result.source_port_id}: ${result.end === "near" ? "NEXT" : "FEXT"}, idle voltage ${value(result.idle_voltage_v, "V")}, positive peak ${value(result.peak_positive_v, "V")}, negative peak ${value(result.peak_negative_v, "V")}`,
          )
        } else if (result.type === "simulation_signal_strobe_margin") {
          console.log(
            `    ${result.source_port_id}: worst setup margin ${value(result.worst_setup_margin_s, "s")}, worst hold margin ${value(result.worst_hold_margin_s, "s")}`,
          )
        }
      }
    }
  }
  console.log(`Simulation results written to ${outputDir}`)
  return results
}
