import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import JSZip from "jszip"
import { exportSnippet } from "lib/shared/export-snippet"

test("gerber export applies JLCPCB pin-1 orientation metadata to PnP rotation", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "tsci-part-orientation-"),
  )
  const circuitJsonPath = path.join(
    temporaryDirectory,
    "orientation.circuit.json",
  )
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_1",
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      center: { x: 10, y: 20 },
      width: 4,
      height: 4,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
      pin1_location: "leftside_top",
      supplier_pin1_location_map: {
        jlcpcb: "bottomside_left",
      },
    },
  ] as AnyCircuitElement[]

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
    expect(pickAndPlaceCsv).toContain("U1,10.000,20.000,top,270")
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})
