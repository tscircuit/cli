import { expect, test } from "bun:test"
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { convertKicadFootprintToTsx } from "cli/convert/convert-kicad-footprint-to-tsx"
import React from "react"
import { RootCircuit } from "tscircuit"

function createTempConvertDir(prefix: string): string {
  const tempRoot = mkdtempSync(join(tmpdir(), prefix))
  symlinkSync(
    join(process.cwd(), "node_modules"),
    join(tempRoot, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  )
  return tempRoot
}

const TWO_PAD_WITH_REFERENCE_FIELDS = `(footprint "TwoPad"
  (version 20240108)
  (generator "pcbnew")
  (layer "F.Cu")
  (attr smd)
  (fp_text reference "REF**" (at 0 -2) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
  (fp_text user "%R" (at 0 2) (layer "F.Fab") (effects (font (size 0.5 0.5) (thickness 0.08))))
  (fp_text user "\${REFERENCE}" (at 0 3) (layer "F.Fab") (effects (font (size 0.5 0.5) (thickness 0.08))))
  (fp_text user "Rev-%R" (at 0 4) (layer "F.Fab") (effects (font (size 0.5 0.5) (thickness 0.08))))
  (fp_text user "KEEP_LITERAL" (at 0 -4) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
  (pad "1" smd rect (at -0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "2" smd rect (at 0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
)
`

const KICAD8_PROPERTY_REFERENCE_MOD = `(footprint "Kicad8Pad"
  (version 20241229)
  (generator "pcbnew")
  (layer "F.Cu")
  (property "Reference" "REF**"
    (at 0 -2 0)
    (layer "F.SilkS")
    (effects (font (size 1 1) (thickness 0.15)))
  )
  (fp_text user "REF**"
    (at 0 3 0)
    (layer "F.SilkS")
    (effects (font (size 0.8 0.8) (thickness 0.12)))
  )
  (pad "1" smd rect (at -0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "2" smd rect (at 0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
)
`

test("convertKicadFootprintToTsx binds reference fields and placeholders to props.name per instance", async () => {
  const tempRoot = createTempConvertDir("tsci-convert-ref-")
  try {
    const modPath = join(tempRoot, "TwoPad.kicad_mod")
    const tsxPath = join(tempRoot, "TwoPad.tsx")
    writeFileSync(modPath, TWO_PAD_WITH_REFERENCE_FIELDS, "utf8")

    await convertKicadFootprintToTsx({
      inputPath: modPath,
      name: "TwoPad",
      output: tsxPath,
    })

    const generatedTsx = readFileSync(tsxPath, "utf8")
    expect(generatedTsx).toContain("text={props.name}")
    expect(generatedTsx).toContain("text={`Rev-${props.name}`}")
    expect(generatedTsx).toContain('text="KEEP_LITERAL"')
    expect(generatedTsx).not.toContain('text="REF**"')

    const modUrl = `${pathToFileURL(tsxPath).href}?t=${Date.now()}`
    const { TwoPad } = await import(modUrl)
    const circuit = new RootCircuit()
    circuit.add(
      React.createElement(
        "board",
        { width: 12, height: 8, routingDisabled: true },
        React.createElement(TwoPad, { name: "U1", pcbX: -3, schX: -2 }),
        React.createElement(TwoPad, { name: "U2", pcbX: 3, schX: 2 }),
      ),
    )
    await circuit.renderUntilSettled()

    const silkscreenTexts = circuit.db.pcb_silkscreen_text
      .list()
      .map((entry) => entry.text)
    expect(silkscreenTexts).toContain("U1")
    expect(silkscreenTexts).toContain("U2")
    expect(silkscreenTexts).not.toContain("REF**")
    expect(
      silkscreenTexts.filter((entryText) => entryText === "KEEP_LITERAL"),
    ).toHaveLength(2)

    const fabNoteTexts = circuit.db.pcb_fabrication_note_text
      .list()
      .map((entry) => entry.text)
    expect(fabNoteTexts).toEqual(
      expect.arrayContaining(["U1", "U2", "Rev-U1", "Rev-U2"]),
    )
    expect(fabNoteTexts).not.toContain("%R")
    expect(fabNoteTexts).not.toContain("REF**")
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test("convertKicadFootprintToTsx binds KiCad 8 Reference property without rewriting literal user text", async () => {
  const tempRoot = createTempConvertDir("tsci-convert-prop-ref-")
  try {
    const modPath = join(tempRoot, "Kicad8Pad.kicad_mod")
    const tsxPath = join(tempRoot, "Kicad8Pad.tsx")
    writeFileSync(modPath, KICAD8_PROPERTY_REFERENCE_MOD, "utf8")

    await convertKicadFootprintToTsx({
      inputPath: modPath,
      name: "Kicad8Pad",
      output: tsxPath,
    })

    const generatedTsx = readFileSync(tsxPath, "utf8")
    expect(generatedTsx).toContain("text={props.name}")
    expect(generatedTsx).toContain('text="REF**"')

    const modUrl = `${pathToFileURL(tsxPath).href}?t=${Date.now()}`
    const { Kicad8Pad } = await import(modUrl)
    const circuit = new RootCircuit()
    circuit.add(
      React.createElement(
        "board",
        { width: 12, height: 8, routingDisabled: true },
        React.createElement(Kicad8Pad, { name: "J1", pcbX: -3, schX: -2 }),
        React.createElement(Kicad8Pad, { name: "J2", pcbX: 3, schX: 2 }),
      ),
    )
    await circuit.renderUntilSettled()

    const silkscreenTexts = circuit.db.pcb_silkscreen_text
      .list()
      .map((entry) => entry.text)
    expect(silkscreenTexts).toEqual(
      expect.arrayContaining(["J1", "J2", "REF**"]),
    )
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})
