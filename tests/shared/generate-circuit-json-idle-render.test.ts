import { expect, test } from "bun:test"
import path from "node:path"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import {
  stats,
  installRenderCounter,
} from "../fixtures/delayed-native-routing.circuit"

test("CLI waits for native routing without idle whole-tree render passes", async () => {
  stats.componentCount = 2
  stats.delayMs = 500
  stats.rendersWhileWaiting = 0
  stats.totalRenders = 0
  stats.inputs = []
  const statuses: string[] = [],
    restore = installRenderCounter()
  try {
    const result = await generateCircuitJson({
      filePath: path.resolve(
        import.meta.dir,
        "../fixtures/delayed-native-routing.circuit.tsx",
      ),
      platformConfig: { partsEngineDisabled: true },
      onAsyncEffectStatus: (name) => statuses.push(name),
    })
    expect(
      result.circuitJson.filter((row) => row.type === "pcb_trace").length,
    ).toBeGreaterThan(0)
    expect(stats.inputs.length).toBeGreaterThan(0)
    expect(statuses.length).toBeGreaterThan(0)
    expect(new Set(statuses).size).toBe(statuses.length)
    expect(stats.rendersWhileWaiting).toBe(0)
  } finally {
    restore()
  }
})
