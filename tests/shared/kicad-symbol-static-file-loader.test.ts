import "bun-match-svg"
import { expect, test } from "bun:test"
import { readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { temporaryDirectory } from "tempy"

test("generateCircuitJson imports .kicad_sym files as chip symbols", async () => {
  const tmpDir = temporaryDirectory()
  globalThis.deferredCleanupFns.push(() =>
    rm(tmpDir, { recursive: true, force: true }),
  )

  const circuitPath = path.join(tmpDir, "kicad-symbol.circuit.tsx")
  const symbolPath = path.join(tmpDir, "test-symbol.kicad_sym")
  const symbolFixturePath = new URL(
    "../fixtures/assets/test-symbol.kicad_sym",
    import.meta.url,
  )

  await writeFile(symbolPath, await readFile(symbolFixturePath))
  await writeFile(
    circuitPath,
    `
import symbol from "./test-symbol.kicad_sym"

export default function KicadSymbolCircuit() {
  return (globalThis as any).React.createElement(
    "board",
    { width: "10mm", height: "10mm" },
    (globalThis as any).React.createElement("chip", { name: "U1", symbol }),
  )
}
`,
  )

  const platformConfig = getPlatformConfigWithCliDefaults({
    localCacheEngine: {
      getItem: () => null,
      setItem: () => {},
    },
  })
  expect(typeof platformConfig.staticFileLoaderMap?.kicad_sym).toBe("function")

  const { circuitJson } = await generateCircuitJson({
    filePath: circuitPath,
    platformConfig,
  })

  expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
