import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { EasyEdaJsonSchema } from "easyeda"
import {
  convertEasyEdaJsonToCircuitJson,
  generateFootprintTsx,
} from "easyeda/browser"
import { convertImportedFootprintToFootprinter } from "lib/import/footprinter/convert-imported-footprint-to-footprinter"
import { getEasyEdaFootprinterSourceHints } from "lib/import/footprinter/get-easyeda-footprinter-source-hints"
import c82046 from "tests/fixtures/assets/c82046.raweasy.json"

// Offline repro of `tsci import C82046 --jlcpcb` losing the polarity artwork
// retained by `tsci import C82046 --jlcpcb --use-exact-footprint`.
const supplier = EasyEdaJsonSchema.parse(c82046)
const circuitJson = convertEasyEdaJsonToCircuitJson(supplier, {
  shouldRecenter: true,
  showDesignator: true,
}) as AnyCircuitElement[]
const exactTsx = `export const MBR0530T1G = () => (
  <diode
    name="D1"
    pinLabels={{ pin1: ["cathode", "neg"], pin2: ["anode", "pos"] }}
    footprint={${generateFootprintTsx(circuitJson)}}
  />
)`

const polarityArtworkCounts = (tsx: string) => ({
  silkscreenPaths: (tsx.match(/<silkscreenpath\b/g) ?? []).length,
  fabricationNotePaths: (tsx.match(/<fabricationnotepath\b/g) ?? []).length,
})

test("C82046 exact footprint contains the supplier's polarity artwork", () => {
  expect(supplier.lcsc.number).toBe("C82046")
  expect(supplier.dataStr.head.c_para["Manufacturer Part"]).toBe("MBR0530T1G")
  expect(circuitJson.filter((e) => e.type === "pcb_smtpad")).toHaveLength(2)
  expect(polarityArtworkCounts(exactTsx)).toEqual({
    silkscreenPaths: 12,
    fabricationNotePaths: 4,
  })
})

test.failing(
  "C82046 normal import preserves the exact footprint's polarity artwork",
  () => {
    const normalImport = convertImportedFootprintToFootprinter({
      circuitJson,
      sourceHints: getEasyEdaFootprinterSourceHints(c82046),
      tsx: exactTsx,
    })

    expect(polarityArtworkCounts(normalImport.tsx)).toEqual(
      polarityArtworkCounts(exactTsx),
    )
  },
)
