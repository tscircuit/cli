import { expect, test } from "bun:test"
import path from "node:path"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import {
  stats,
  installRenderCounter,
  stopDelayedNativeRouting,
} from "../fixtures/delayed-native-routing.circuit"

test("CLI still checks autorouter timeouts while idle renders are suspended", async () => {
  stats.componentCount = 2
  stats.delayMs = 1000
  stats.rendersWhileWaiting = 0
  stats.totalRenders = 0
  stats.inputs = []
  const restore = installRenderCounter()
  try {
    await expect(
      generateCircuitJson({
        filePath: path.resolve(
          import.meta.dir,
          "../fixtures/delayed-native-routing.circuit.tsx",
        ),
        platformConfig: { partsEngineDisabled: true },
        autorouterDiagnostics: { timeoutMs: 100, log: () => {} },
      }),
    ).rejects.toThrow("Autorouter timeout")
    expect(stats.rendersWhileWaiting).toBe(0)
  } finally {
    stopDelayedNativeRouting()
    restore()
  }
})
