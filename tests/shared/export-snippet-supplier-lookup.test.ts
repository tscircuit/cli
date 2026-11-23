import { expect, mock, spyOn, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import JSZip from "jszip"
import { exportSnippet } from "lib/shared/export-snippet"
import placedParts from "../fixtures/real-supplier-orientation/placed-bottom-sot23.circuit.json"
import supplierFootprint from "../fixtures/real-supplier-orientation/C916374.circuit.json"

test.failing(
  "gerber export prepares real supplier frames for prebuilt bottom-side JSON",
  async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tsci-supplier-orientation-"))
    const filePath = path.join(dir, "board.circuit.json")
    const inputText = JSON.stringify(placedParts)
    const platformFetch = fetch
    const fetchPartCircuitJson = mock(
      async () => supplierFootprint as AnyCircuitElement[],
    )
    const warnings = spyOn(console, "warn").mockImplementation(() => {})
    try {
      await writeFile(filePath, inputText)
      let output: Buffer | undefined
      let exitCode: number | undefined
      await exportSnippet({
        filePath,
        format: "gerbers",
        writeFile: false,
        platformConfig: {
          partsEngine: { fetchPartCircuitJson },
          platformFetch,
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
      expect(await readFile(filePath, "utf8")).toBe(inputText)
      expect(fetchPartCircuitJson).toHaveBeenCalledTimes(1)
      expect(fetchPartCircuitJson).toHaveBeenCalledWith({
        supplierPartNumber: "C916374",
        platformFetch,
      })
      const zip = await JSZip.loadAsync(output!)
      expect(await zip.file("pick_and_place.csv")!.async("string")).toBe(
        "Designator,Mid X,Mid Y,Layer,Rotation\r\nU3,3.000,-4.000,bottom,180\r\nU4,9.000,-4.000,bottom,90",
      )
      expect(warnings.mock.calls.map(([message]) => message)).toEqual([
        "U3: using jlcpcb CAD rotation 180°; the factory assembly zero is unverified.",
        "U4: using jlcpcb CAD rotation 90°; the factory assembly zero is unverified.",
      ])
    } finally {
      warnings.mockRestore()
      await rm(dir, { recursive: true, force: true })
    }
  },
)

test.failing(
  "gerber export refuses selected parts with missing supplier frames when lookup fails or is disabled",
  async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tsci-supplier-failure-"))
    try {
      const filePath = path.join(dir, "board.circuit.json")
      await writeFile(filePath, JSON.stringify(placedParts))
      for (const disabled of [false, true]) {
        let exitCode: number | undefined
        const errors: string[] = []
        let outputWritten = false
        const fetchPartCircuitJson = mock(
          async (): Promise<AnyCircuitElement[]> => {
            throw new Error("supplier offline")
          },
        )
        await exportSnippet({
          filePath,
          format: "gerbers",
          writeFile: false,
          platformConfig: {
            partsEngineDisabled: disabled,
            partsEngine: { fetchPartCircuitJson },
          },
          onExit: (code) => {
            exitCode = code
          },
          onError: (message) => {
            errors.push(message)
          },
          onSuccess: () => {
            outputWritten = true
          },
        })
        expect(exitCode).toBe(1)
        expect(outputWritten).toBe(false)
        expect(errors.join("\n")).toContain("U3 (jlcpcb:C916374)")
        expect(errors.join("\n")).toContain(
          disabled ? "disabled or unavailable" : "supplier offline",
        )
        expect(fetchPartCircuitJson).toHaveBeenCalledTimes(disabled ? 0 : 1)
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  },
)
