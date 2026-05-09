import { expect, test } from "bun:test"
import { rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { CircuitJsonToKicadPcbConverter } from "circuit-json-to-kicad"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { getCompletePlatformConfig } from "lib/shared/get-complete-platform-config"
import { temporaryDirectory } from "tempy"

test("generateCircuitJson uses the default kicad_pcb static file loader", async () => {
  const tmpDir = temporaryDirectory()
  globalThis.deferredCleanupFns.push(() =>
    rm(tmpDir, { recursive: true, force: true }),
  )

  const pcbConverter = new CircuitJsonToKicadPcbConverter([
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 18,
      height: 12,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
  ])
  pcbConverter.runUntilFinished()

  const circuitPath = path.join(tmpDir, "native-kicad-loader.circuit.tsx")
  const kicadPcbPath = path.join(tmpDir, "native-board.kicad_pcb")
  const kicadPcbContent = pcbConverter.getOutputString()

  await writeFile(kicadPcbPath, kicadPcbContent)
  await writeFile(
    circuitPath,
    `
import defaultCircuitJson, {
  Board,
  boardContentCircuitJson,
  circuitJson,
} from "./native-board.kicad_pcb"

export default function NativeKicadLoaderCircuit() {
  if (defaultCircuitJson !== circuitJson) {
    throw new Error("default export did not match circuitJson")
  }

  if (!circuitJson.some((elm: any) => elm.type === "pcb_board")) {
    throw new Error("default kicad_pcb loader did not parse pcb_board")
  }

  if (boardContentCircuitJson.some((elm: any) => elm.type === "pcb_board")) {
    throw new Error("boardContentCircuitJson should not include pcb_board")
  }

  return (globalThis as any).React.createElement(Board)
}
`,
  )

  const platformConfig = getCompletePlatformConfig()
  expect(typeof platformConfig.staticFileLoaderMap?.kicad_pcb).toBe("function")

  const { circuitJson } = await generateCircuitJson({
    filePath: circuitPath,
    platformConfig,
  })

  expect(
    circuitJson.some(
      (elm: any) => elm.type === "pcb_board" && elm.width === 18,
    ),
  ).toBe(true)
})
