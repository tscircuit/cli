import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import JSZip from "jszip"
import { exportSnippet } from "lib/shared/export-snippet"
import supplierFootprint from "../fixtures/real-supplier-orientation/C916374.circuit.json"
import legacyParts from "../fixtures/real-supplier-orientation/placed-bottom-sot23-with-legacy-frame.circuit.json"

test("fabrication export refreshes incorrect frames cached in legacy Core JSON", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "tsci-legacy-orientation-"))
  const filePath = path.join(dir, "board.circuit.json")
  const input = JSON.stringify(legacyParts)
  try {
    await writeFile(filePath, input)
    let output: Buffer | undefined
    await exportSnippet({
      filePath,
      format: "gerbers",
      writeFile: false,
      platformConfig: {
        partsEngine: {
          findPart: async () => ({}),
          fetchPartCircuitJson: () => supplierFootprint as AnyCircuitElement[],
        },
      },
      onExit: (code) => {
        expect(code).toBe(0)
      },
      onError: (message) => {
        throw new Error(message)
      },
      onSuccess: ({ outputContent }) => {
        output = outputContent as Buffer
      },
    })
    const zip = await JSZip.loadAsync(output!)
    expect(await zip.file("pick_and_place.csv")!.async("string")).toBe(
      "Designator,Mid X,Mid Y,Layer,Rotation\r\nU3,3.000,-4.000,bottom,180\r\nU4,9.000,-4.000,bottom,90",
    )
    expect(await readFile(filePath, "utf8")).toBe(input)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
