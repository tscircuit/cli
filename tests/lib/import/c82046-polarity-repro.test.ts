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
import rawC82046 from "../../fixtures/assets/c82046.raweasy.json"

// Pin supplier input so the regression is independent of EasyEDA availability
// and later changes to the C82046 catalog entry.
const supplier = EasyEdaJsonSchema.parse(rawC82046)
const sourceHints = getEasyEdaFootprinterSourceHints(rawC82046)
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

test("C82046 supplier data identifies pin 1 as the cathode", () => {
  expect(supplier.lcsc.number).toBe("C82046")
  expect(supplier.dataStr.head.c_para["Manufacturer Part"]).toBe("MBR0530T1G")
  expect(circuitJson.filter((e) => e.type === "pcb_smtpad")).toHaveLength(2)
  const cathode = circuitJson.find(
    (element) =>
      element.type === "pcb_smtpad" && element.port_hints?.includes("pin1"),
  )
  if (cathode?.type !== "pcb_smtpad") throw new Error("Expected cathode pad")
  expect(cathode.port_hints).toContain("cathode")
})

test("C82046 normal import uses a diode string with explicit cathode polarity", () => {
  const normalImport = convertImportedFootprintToFootprinter({
    circuitJson,
    sourceHints,
    tsx: exactTsx,
  })

  expect(normalImport.mode).toBe("footprinter")
  expect(normalImport.candidate?.family).toBe("diode")
  expect(normalImport.candidate?.footprinterString).toContain("_cathodepin1")
  expect(normalImport.accuracy).toBeGreaterThan(0.98)
  expect(normalImport.tsx).not.toContain("<footprint>")
})

test("C82046 normal import PCB snapshot", async () => {
  const normalImport = convertImportedFootprintToFootprinter({
    circuitJson,
    sourceHints,
    tsx: exactTsx,
  })
  const directory = temporaryDirectory()
  try {
    await symlink(
      path.join(process.cwd(), "node_modules"),
      path.join(directory, "node_modules"),
      "dir",
    )
    const filePath = path.join(directory, "MBR0530T1G.tsx")
    await writeFile(filePath, normalImport.tsx)
    const { circuitJson: rendered } = await generateCircuitJson({ filePath })
    expect(rendered.filter((e) => e.type === "pcb_smtpad")).toHaveLength(2)
    expect(rendered.filter((e) => e.type.endsWith("_error"))).toEqual([])
    const negative = rendered.find(
      (e) => e.type === "pcb_fabrication_note_text" && e.text === "-",
    )
    const positive = rendered.find(
      (e) => e.type === "pcb_fabrication_note_text" && e.text === "+",
    )
    if (
      negative?.type !== "pcb_fabrication_note_text" ||
      positive?.type !== "pcb_fabrication_note_text"
    )
      throw new Error("Expected generated diode polarity labels")
    expect(negative.anchor_position.x).toBeLessThan(positive.anchor_position.x)

    await expect(
      convertCircuitJsonToPcbSvg(rendered, {
        width: 800,
        height: 600,
        layer: "top",
        viewport: { minX: -4, maxX: 4, minY: -2.4, maxY: 3.6 },
        shouldDrawRatsNest: false,
        showCourtyards: true,
        showPinNumbers: true,
        showFabricationNotes: true,
      }),
    ).toMatchSvgSnapshot(import.meta.path, "c82046-polarity-pcb")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 30_000)
