import { mkdir, writeFile } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
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
  const results: AnyCircuitElement[] = await runPipeline(circuitJson)
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
  await mkdir(outputDir, { recursive: true })
  await writeFile(
    join(outputDir, "results.circuit.json"),
    JSON.stringify(results, null, 2),
  )

  for (const block of circuitJson) {
    if (block.type !== "simulation_signal_integrity") continue
    console.log(
      `Signal integrity: ${block.name ?? block.simulation_signal_integrity_id}`,
    )
    for (const signal of circuitJson) {
      if (
        signal.type !== "simulation_signal" ||
        signal.simulation_signal_integrity_id !==
          block.simulation_signal_integrity_id
      )
        continue
      console.log(`  ${signal.name}`)
      for (const result of results) {
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
            `    ${result.source_port_id}: NEXT peak ${value(result.peak_next_v, "V")}, FEXT peak ${value(result.peak_fext_v, "V")}`,
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
