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
  const { loadIbisSources, createNativeSolver } = await import(
    "@tscircuit/signal-integrity-pipeline/node"
  )
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
    for (const [path, contents] of Object.entries(result.files)) {
      if (
        !path ||
        path.includes("\\") ||
        path.startsWith("/") ||
        path.split("/").some((part) => !part || part === "." || part === "..")
      )
        throw new Error(`Expected a safe project-relative file path: ${path}`)
      const target = join(stagedDir, path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, contents)
    }
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
    console.log(`PCB transient channel simulation: ${block.name ?? "unnamed"}`)
    for (const signal of circuitJson) {
      if (
        signal.type !== "simulation_signal" ||
        signal.simulation_signal_integrity_id !==
          block.simulation_signal_integrity_id
      )
        continue
      console.log(`  ${signal.name}`)
      for (const result of block.results) {
        if (
          result.type !== "simulation_signal_waveform" ||
          result.simulation_signal_id !== signal.simulation_signal_id
        )
          continue
        const idle =
          result.idle_voltage_v === undefined
            ? ""
            : `, idle voltage ${result.idle_voltage_v.toPrecision(4)} V`
        console.log(
          `    ${result.source_port_id}: ${result.end}, ${result.timestamps_s.length} samples${idle}`,
        )
      }
    }
  }
  console.log(`Simulation results written to ${outputDir}`)
  return results
}
