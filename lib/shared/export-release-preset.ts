import { createHash } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import type { PcbSnapshotSettings } from "lib/project-config/project-config-schema"
import { version } from "../../package.json"
import { analyzeCircuitJson } from "./circuit-json-diagnostics"
import { convertCircuitJsonToExport } from "./convert-circuit-json-to-export"
import { convertCircuitJsonToGerbers } from "./convert-circuit-json-to-gerbers"
import type { ExportFormat } from "./export-snippet"

const RELEASE_EXPORTS = [
  { format: "circuit-json", fileName: "circuit.json" },
  { format: "schematic-svg", fileName: "schematic.svg" },
  { format: "pcb-svg", fileName: "pcb.svg" },
  { format: "assembly-svg", fileName: "assembly.svg" },
  { format: "glb", fileName: "board.glb" },
] satisfies { format: ExportFormat; fileName: string }[]

export const exportReleasePreset = async ({
  circuitJson,
  filePath,
  outputDestination,
  platformConfig,
  pcbSnapshotSettings,
}: {
  circuitJson: AnyCircuitElement[]
  filePath: string
  outputDestination: string
  platformConfig?: PlatformConfig
  pcbSnapshotSettings?: PcbSnapshotSettings
}) => {
  await mkdir(outputDestination, { recursive: true })
  const manifestPath = path.join(outputDestination, "release-manifest.json")
  // A manifest marks completion, including when replacing a previous release.
  await rm(manifestPath, { force: true })

  const artifacts: Record<string, string | Buffer> = {}
  for (const { format, fileName } of RELEASE_EXPORTS) {
    artifacts[fileName] = await convertCircuitJsonToExport({
      circuitJson,
      format,
      filePath,
      platformConfig,
      pcbSnapshotSettings,
    })
  }
  const { gerbersZip, bomCsv, pnpCsv } =
    await convertCircuitJsonToGerbers(circuitJson)
  artifacts["gerbers.zip"] = gerbersZip
  artifacts["bom.csv"] = bomCsv
  artifacts["pick-and-place.csv"] = pnpCsv
  artifacts["checks.json"] = JSON.stringify(
    analyzeCircuitJson(circuitJson),
    null,
    2,
  )

  const files = []
  for (const [fileName, content] of Object.entries(artifacts)) {
    await writeFile(path.join(outputDestination, fileName), content)
    files.push({
      path: fileName,
      bytes: Buffer.byteLength(content),
      sha256: createHash("sha256").update(content).digest("hex"),
    })
  }
  await writeFile(
    manifestPath,
    JSON.stringify(
      { schemaVersion: 1, preset: "release", cliVersion: version, files },
      null,
      2,
    ),
  )
}
