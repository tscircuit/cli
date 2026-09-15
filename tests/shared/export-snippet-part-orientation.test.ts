import { expect, mock, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import JSZip from "jszip"
import { existsSync } from "node:fs"
import fixture from "../fixtures/export/sk9822-routed-without-orientation.circuit.json"
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

test("prebuilt routed JSON is enriched before PnP export without rewriting the input", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "tsci-routed-orientation-"),
  )
  const filePath = path.join(directory, "routed.circuit.json")
  const sourceText = JSON.stringify(fixture)
  const supplierJson: AnyCircuitElement[] = [
    [1, -1, -2],
    [2, 1, -2],
    [3, 1, 2],
    [4, -1, 2],
  ].map(([pin, x, y]) => ({
    type: "pcb_smtpad",
    pcb_smtpad_id: `pad${pin}`,
    pcb_component_id: "supplier",
    shape: "rect",
    layer: "top",
    x: x!,
    y: y!,
    width: 1,
    height: 1,
    port_hints: [`pin${pin}`],
  }))
  const fetchPartCircuitJson = mock(async () => supplierJson)
  try {
    await writeFile(filePath, sourceText)
    let output: Buffer | undefined
    let exitCode: number | undefined
    await exportSnippet({
      filePath,
      format: "gerbers",
      writeFile: false,
      platformConfig: {
        partsEngine: { findPart: () => ({}), fetchPartCircuitJson },
      },
      onExit: (code) => {
        exitCode = code
      },
      onError: (message) => {
        throw new Error(message)
      },
      onSuccess: ({ outputContent }) => {
        output = outputContent as Buffer
      },
    })
    expect(exitCode).toBe(0)
    expect(fetchPartCircuitJson).toHaveBeenCalledTimes(1)
    const zip = await JSZip.loadAsync(output!)
    expect(await zip.file("pick_and_place.csv")!.async("string")).toContain(
      "D_RGB,20.000,-19.000,top,90",
    )
    expect(await readFile(filePath, "utf8")).toBe(sourceText)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("unresolved JLCPCB rotations fail export without writing a fabrication ZIP", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "tsci-unverified-orientation-"),
  )
  const filePath = path.join(directory, "routed.circuit.json")
  const outputPath = path.join(directory, "fabrication.zip")
  try {
    await writeFile(filePath, JSON.stringify(fixture))
    let exitCode: number | undefined
    const onError = mock((_message: string) => {})
    const onSuccess = mock(() => {})
    await exportSnippet({
      filePath,
      outputPath,
      format: "gerbers",
      platformConfig: { partsEngineDisabled: true },
      onExit: (code) => {
        exitCode = code
      },
      onError,
      onSuccess,
    })
    expect(exitCode).toBe(1)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError.mock.calls[0]?.[0]).toContain("D_RGB (jlcpcb:C5378730)")
    expect(existsSync(outputPath)).toBe(false)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
