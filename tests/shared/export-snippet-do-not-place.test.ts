import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import JSZip from "jszip"
import { exportSnippet } from "lib/shared/export-snippet"

test("gerber export excludes DNP components from both BOM and PnP CSVs", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "tsci-do-not-place-"),
  )
  const circuitJsonPath = path.join(
    temporaryDirectory,
    "do-not-place.circuit.json",
  )
  const circuitJson: AnyCircuitElement[] = [true, false, undefined].flatMap(
    (doNotPlace, index): AnyCircuitElement[] => [
      {
        type: "source_component",
        source_component_id: `source_${index}`,
        ftype: "simple_resistor",
        name: `R${index + 1}`,
        resistance: 1000,
        supplier_part_numbers: { jlcpcb: ["C123"] },
      },
      {
        type: "pcb_component",
        pcb_component_id: `pcb_${index}`,
        source_component_id: `source_${index}`,
        center: { x: 10, y: 20 },
        width: 2,
        height: 1,
        layer: "top",
        rotation: 0,
        obstructs_within_bounds: true,
        ...(doNotPlace === undefined ? {} : { do_not_place: doNotPlace }),
      },
    ],
  )

  try {
    await writeFile(circuitJsonPath, JSON.stringify(circuitJson))

    let fabricationZip: Buffer | undefined
    let exitCode: number | undefined
    await exportSnippet({
      filePath: circuitJsonPath,
      format: "gerbers",
      writeFile: false,
      onExit: (code) => {
        exitCode = code
      },
      onError: (message) => {
        throw new Error(message)
      },
      onSuccess: ({ outputContent }) => {
        fabricationZip = outputContent as Buffer
      },
    })

    expect(exitCode).toBe(0)
    const zip = await JSZip.loadAsync(fabricationZip!)
    const pickAndPlaceCsv = await zip
      .file("pick_and_place.csv")!
      .async("string")
    const bomCsv = await zip.file("bom.csv")!.async("string")
    for (const csv of [bomCsv, pickAndPlaceCsv]) {
      expect(csv).not.toContain("R1")
      expect(csv).toContain("R2")
      expect(csv).toContain("R3")
      expect(csv.trim().split(/\r?\n/)).toHaveLength(3)
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})
