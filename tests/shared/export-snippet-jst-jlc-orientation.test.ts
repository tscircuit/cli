import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import JSZip from "jszip"
import { exportSnippet } from "lib/shared/export-snippet"

test("gerber export resolves the four-pin JST JLC orientation in prebuilt circuit JSON", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "tsci-jst-orientation-"),
  )
  const circuitJsonPath = path.join(temporaryDirectory, "jst.circuit.json")
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_j1",
      ftype: "simple_chip",
      name: "J1",
      supplier_part_numbers: { jlcpcb: ["C131334"] },
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_j1",
      source_component_id: "source_j1",
      center: { x: 17, y: -4.7 },
      width: 8,
      height: 4,
      layer: "top",
      rotation: 90,
      obstructs_within_bounds: true,
    },
    ...[-7.7, -5.7, -3.7, -1.7].map((y, index) => ({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: `j1_hole_${index + 1}`,
      pcb_component_id: "pcb_j1",
      shape: "circle",
      layers: ["top", "bottom"],
      x: 17,
      y,
      hole_diameter: 0.75,
      outer_diameter: 1.4,
      port_hints: [`pin${index + 1}`],
    })),
  ] as AnyCircuitElement[]

  try {
    await writeFile(circuitJsonPath, JSON.stringify(circuitJson))

    let supplierFetchCount = 0
    let fabricationZip: Buffer | undefined
    let exitCode: number | undefined
    await exportSnippet({
      filePath: circuitJsonPath,
      format: "gerbers",
      writeFile: false,
      platformConfig: {
        partsEngine: {
          findPart: () => ({ jlcpcb: ["C131334"] }),
          fetchPartCircuitJson: ({ supplierPartNumber }) => {
            expect(supplierPartNumber).toBe("C131334")
            supplierFetchCount++
            return [3, 1, -1, -3].map((x, index) => ({
              type: "pcb_plated_hole",
              pcb_plated_hole_id: `supplier_hole_${index + 1}`,
              shape: "circle",
              layers: ["top", "bottom"],
              x,
              y: -0.55,
              hole_diameter: 1,
              outer_diameter: 1.6,
              port_hints: [`pin${index + 1}`],
            })) as AnyCircuitElement[]
          },
        },
      },
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
    expect(supplierFetchCount).toBe(1)
    const zip = await JSZip.loadAsync(fabricationZip!)
    const pickAndPlaceCsv = await zip
      .file("pick_and_place.csv")!
      .async("string")
    expect(pickAndPlaceCsv).toContain("J1,17.000,-4.700,top,270")

    let errorMessage = ""
    await exportSnippet({
      filePath: circuitJsonPath,
      format: "gerbers",
      writeFile: false,
      platformConfig: { partsEngineDisabled: true },
      onExit: (code) => {
        exitCode = code
      },
      onError: (message) => {
        errorMessage = message
      },
      onSuccess: () => {
        throw new Error("An unverified placement must not produce a ZIP")
      },
    })
    expect(exitCode).toBe(1)
    expect(errorMessage).toContain("J1 (jlcpcb:C131334)")
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})
