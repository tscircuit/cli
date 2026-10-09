import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import type { RootCircuit } from "tscircuit"

/** One collector per render/entrypoint. Artifacts never change the circuit result. */
export function attachAutoroutingArtifacts(
  root: Pick<RootCircuit, "on">,
  filePath: string,
  projectDir = process.cwd(),
) {
  const entryPath = path.relative(
    projectDir,
    path.resolve(projectDir, filePath),
  )
  const entryKey = `${path.basename(filePath).replace(/[^a-zA-Z0-9_-]/g, "-")}-${createHash("sha256").update(entryPath).digest("hex").slice(0, 10)}`
  const directory = path.resolve(
    projectDir,
    ".tscircuit",
    "autorouting-artifacts",
    entryKey,
  )
  let warnedMissingReplayMetadata = false
  root.on("autorouting:end", (event) => {
    try {
      if (event.pcbTracePathsUnavailableReason) {
        throw new Error(event.pcbTracePathsUnavailableReason)
      }
      if (
        event.pcbTracePaths === undefined ||
        event._actualRoutingPhaseOrderIndex === undefined
      ) {
        if (!warnedMissingReplayMetadata) {
          const missingFields = [
            event.pcbTracePaths === undefined ? "pcbTracePaths" : undefined,
            event._actualRoutingPhaseOrderIndex === undefined
              ? "_actualRoutingPhaseOrderIndex"
              : undefined,
          ].filter((field) => field !== undefined)
          console.warn(
            `Could not save autorouting replay JSON: the routing event is missing ${missingFields.join(", ")}. This only affects replay export, not PCB routing. Check that your project's tscircuit runtime supports replay export.`,
          )
          warnedMissingReplayMetadata = true
        }
        return
      }
      if (event.pcbTracePaths.length === 0) return
      const phase = event.routingPhaseIndex ?? "default"
      const order = event._actualRoutingPhaseOrderIndex
      const safeSubcircuit = event.subcircuit_id.replace(/[^a-zA-Z0-9_-]/g, "-")
      const stage =
        event.phaseStageIndex === undefined
          ? ""
          : `-stage-${event.phaseStageIndex}`
      const outputPath = path.join(
        directory,
        `${safeSubcircuit}-phase-${phase}-order-${order}${stage}.pcb-trace-paths.json`,
      )
      const contents = `${JSON.stringify(event.pcbTracePaths, null, 2)}\n`
      fs.mkdirSync(directory, { recursive: true })
      if (
        !fs.existsSync(outputPath) ||
        fs.readFileSync(outputPath, "utf8") !== contents
      ) {
        fs.writeFileSync(outputPath, contents)
      }
      console.log(
        `Saved autorouting paths to ${path.relative(projectDir, outputPath)} (import this JSON into <autoroutingphase pcbTracePaths={...} />).`,
      )
    } catch (error) {
      console.warn(
        `Could not save autorouting paths for ${event.subcircuit_id}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  })
}
