import "bun-match-svg"
import { expect, test } from "bun:test"
import { rm, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { EasyEdaJsonSchema } from "easyeda"
import {
  convertEasyEdaJsonToCircuitJson,
  generateFootprintTsx,
} from "easyeda/browser"
import { convertImportedFootprintToFootprinter } from "lib/import/footprinter/convert-imported-footprint-to-footprinter"
import { getEasyEdaFootprinterSourceHints } from "lib/import/footprinter/get-easyeda-footprinter-source-hints"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { convertCircuitJsonToPcbSvg } from "lib/shared/render-pcb-svg"
import { temporaryDirectory } from "tempy"
import c82046 from "tests/fixtures/assets/c82046.raweasy.json"

const supplierCircuitJson = convertEasyEdaJsonToCircuitJson(
  EasyEdaJsonSchema.parse(c82046),
  { shouldRecenter: true, showDesignator: true },
) as AnyCircuitElement[]
const exactTsx = `export const MBR0530T1G = () => (
  <diode
    name="D1"
    pinLabels={{ pin1: ["cathode", "neg"], pin2: ["anode", "pos"] }}
    footprint={${generateFootprintTsx(supplierCircuitJson)}}
  />
)`

// Snapshot the rendered component, including the normal import's conversion.
// The exact import is a control; both use the same viewport and orientation.
test.each(["default", "exact"] as const)(
  "C82046 %s import PCB snapshots",
  async (mode) => {
    const tsx =
      mode === "exact"
        ? exactTsx
        : convertImportedFootprintToFootprinter({
            circuitJson: supplierCircuitJson,
            sourceHints: getEasyEdaFootprinterSourceHints(c82046),
            tsx: exactTsx,
          }).tsx
    const directory = temporaryDirectory()
    try {
      await symlink(
        path.join(process.cwd(), "node_modules"),
        path.join(directory, "node_modules"),
        "dir",
      )
      const filePath = path.join(directory, "MBR0530T1G.tsx")
      await writeFile(filePath, tsx)
      const { circuitJson } = await generateCircuitJson({ filePath })
      expect(circuitJson.filter((e) => e.type === "pcb_smtpad")).toHaveLength(2)
      expect(circuitJson.filter((e) => e.type.endsWith("_error"))).toEqual([])

      for (const showFabricationNotes of [false, true]) {
        const svg = convertCircuitJsonToPcbSvg(circuitJson, {
          width: 800,
          height: 600,
          layer: "top",
          viewport: { minX: -4, maxX: 4, minY: -2.4, maxY: 3.6 },
          shouldDrawRatsNest: false,
          showCourtyards: true,
          showPinNumbers: true,
          showFabricationNotes,
        })
        await expect(svg).toMatchSvgSnapshot(
          import.meta.path,
          `c82046-${mode}-pcb${showFabricationNotes ? "-with-fabrication-notes" : ""}`,
        )
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  },
  30_000,
)
