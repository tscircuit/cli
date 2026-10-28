import { mock } from "bun:test"
import { writeFileSync } from "node:fs"

const adapter = import.meta.resolve("@tscircuit/pcb-spice-pipeline/node")
const { loadIbisSources, writePipelineOutput } = await import(adapter)
mock.module(adapter, () => ({
  loadIbisSources,
  writePipelineOutput,
  createNativeSolver(options?: { timeoutMs?: number }) {
    writeFileSync(
      "native-options.json",
      JSON.stringify(options?.timeoutMs ?? null),
    )
    throw new Error("stopped at native process boundary")
  },
}))
