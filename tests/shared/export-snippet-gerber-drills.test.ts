import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import JSZip from "jszip"
import { exportSnippet } from "lib/shared/export-snippet"

test("gerber export includes every plated drill span and NPTH drill file", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "tsci-gerber-drills-"),
  )
  const circuitJsonPath = path.join(temporaryDirectory, "board.circuit.json")
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 4,
    },
    {
      type: "pcb_via",
      pcb_via_id: "blind-via",
      x: -4,
      y: 0,
      hole_diameter: 0.6,
      outer_diameter: 1.2,
      layers: ["top", "inner1"],
      from_layer: "top",
      to_layer: "inner1",
    },
    {
      type: "pcb_via",
      pcb_via_id: "through-via",
      x: 4,
      y: 0,
      hole_diameter: 0.6,
      outer_diameter: 1.2,
      layers: ["top", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "mounting-hole",
      x: 0,
      y: 4,
      hole_diameter: 2,
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
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        "F_Cu.gbr",
        "In1_Cu.gbr",
        "In2_Cu.gbr",
        "B_Cu.gbr",
        "Edge_Cuts.gbr",
        "drill-L1-L2.drl",
        "drill-L1-L4.drl",
        "drill_npth.drl",
        "bom.csv",
        "pick_and_place.csv",
      ]),
    )
    expect(await zip.file("drill-L1-L2.drl")!.async("string")).toContain(
      "X-4.0000Y0.0000",
    )
    expect(await zip.file("drill-L1-L4.drl")!.async("string")).toContain(
      "X4.0000Y0.0000",
    )
    expect(await zip.file("drill_npth.drl")!.async("string")).toContain(
      "X0.0000Y4.0000",
    )
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})
