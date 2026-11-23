import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const kicadMod = `
(footprint "R_01005_0402Metric"
	(version 20260206)
	(generator "kicad-footprint-generator")
	(layer "F.Cu")
	(descr "Resistor SMD 01005 (0402 Metric), square (rectangular) end terminal, IPC-7351 nominal, (Body size source: http://www.vishay.com/docs/20056/crcw01005e3.pdf)")
	(tags "resistor")
	(property "Reference" "REF**"
		(at 0 -1 0)
		(layer "F.SilkS")
		(effects
			(font
				(size 1 1)
				(thickness 0.15)
			)
		)
	)
	(property "Value" "R_01005_0402Metric"
		(at 0 1 0)
		(layer "F.Fab")
		(effects
			(font
				(size 1 1)
				(thickness 0.15)
			)
		)
	)
	(property "KiLib_Generator" "SMD_2terminal_chip_molded"
		(at 0 0 0)
		(layer "F.SilkS")
		(hide yes)
		(effects
			(font
				(size 1 1)
				(thickness 0.15)
			)
		)
	)
	(attr smd)
	(duplicate_pad_numbers_are_jumpers no)
	(fp_rect
		(start -0.6 -0.3)
		(end 0.6 0.3)
		(stroke
			(width 0.05)
			(type solid)
		)
		(fill no)
		(layer "F.CrtYd")
	)
	(fp_rect
		(start -0.2 -0.1)
		(end 0.2 0.1)
		(stroke
			(width 0.1)
			(type solid)
		)
		(fill no)
		(layer "F.Fab")
	)
	(fp_text user "REFERENCE"
		(at 0 -0.62 0)
		(layer "F.Fab")
		(effects
			(font
				(size 0.25 0.25)
				(thickness 0.04)
			)
		)
	)
	(pad "" smd roundrect
		(at -0.275 0)
		(size 0.27 0.27)
		(layers "F.Paste")
		(roundrect_rratio 0.25)
	)
	(pad "" smd roundrect
		(at 0.275 0)
		(size 0.27 0.27)
		(layers "F.Paste")
		(roundrect_rratio 0.25)
	)
	(pad "1" smd roundrect
		(at -0.25 0)
		(size 0.4 0.3)
		(layers "F.Cu" "F.Mask")
		(roundrect_rratio 0.25)
	)
	(pad "2" smd roundrect
		(at 0.25 0)
		(size 0.4 0.3)
		(layers "F.Cu" "F.Mask")
		(roundrect_rratio 0.25)
	)
	(embedded_fonts no)
)

`

test("convert kicad_mod to tsx", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const modPath = path.join(tmpDir, "R_01005_0402Metric.kicad_mod")
  await writeFile(modPath, kicadMod)

  const { stdout, stderr } = await runCommand(`tsci convert ${modPath}`)
  expect(stderr).toBe("")
  expect(stdout).toContain("Converted")

  const tsxPath = path.join(tmpDir, "R_01005_0402Metric.tsx")
  const tsx = await readFile(tsxPath, "utf-8")
  expect(tsx).toContain("export const R_01005_0402Metric")
  expect(tsx).toContain("text={props.name}")
  expect(tsx).toContain('text="REFERENCE"')
})

test("convert kicad_mod preserves reference semantics across fp_text reference, %R, and ${REFERENCE}", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const modPath = path.join(tmpDir, "two-pad.kicad_mod")
  const tsxPath = path.join(tmpDir, "TwoPad.tsx")
  const boardPath = path.join(tmpDir, "converted-labels.tsx")

  await writeFile(
    modPath,
    `
(footprint "TwoPad"
  (version 20240108)
  (generator "pcbnew")
  (layer "F.Cu")
  (attr smd)
  (fp_text reference "REF**" (at 0 -2) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
  (fp_text user "%R" (at 0 0) (layer "F.Fab") (effects (font (size 0.5 0.5) (thickness 0.08))))
  (fp_text user "\${REFERENCE}" (at 0 1) (layer "F.Fab") (effects (font (size 0.5 0.5) (thickness 0.08))))
  (fp_text user "PIN1" (at -1 0) (layer "F.SilkS") (effects (font (size 0.6 0.6) (thickness 0.1))))
  (fp_text user "REF**" (at 1 0) (layer "F.Fab") (effects (font (size 0.5 0.5) (thickness 0.08))))
  (pad "1" smd rect (at -0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "2" smd rect (at 0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
)
`,
  )

  const convertRes = await runCommand(
    `tsci convert ${modPath} --name TwoPad --output ${tsxPath}`,
  )
  expect(convertRes.exitCode).toBe(0)
  expect(convertRes.stderr).toBe("")

  const tsx = await readFile(tsxPath, "utf-8")
  expect(tsx).toContain("export const TwoPad")
  expect(tsx.match(/text=\{props\.name\}/g)).toHaveLength(3)
  expect(tsx).toContain('text="PIN1"')
  expect(tsx).toContain('text="REF**"')
  expect(tsx).not.toContain('text="%R"')

  await writeFile(
    boardPath,
    `
import { TwoPad } from "./TwoPad"
export default () => (
  <board width={12} height={8} routingDisabled>
    <TwoPad name="U1" pcbX={-3} schX={-2} />
    <TwoPad name="U2" pcbX={3} schX={2} />
  </board>
)
`,
  )

  const buildRes = await runCommand(`tsci build ${boardPath}`)
  expect(buildRes.exitCode).toBe(0)

  const circuitJson = JSON.parse(
    await readFile(
      path.join(tmpDir, "dist", "converted-labels", "circuit.json"),
      "utf-8",
    ),
  ) as Array<{ type: string; text?: string }>

  const silkscreenTexts = circuitJson
    .filter((el) => el.type === "pcb_silkscreen_text")
    .map((el) => el.text)
    .sort()
  expect(silkscreenTexts).toEqual(["PIN1", "PIN1", "U1", "U2"])

  const fabTexts = circuitJson
    .filter((el) => el.type === "pcb_fabrication_note_text")
    .map((el) => el.text)
    .sort()
  expect(fabTexts).toEqual(["REF**", "REF**", "U1", "U1", "U2", "U2"])
})

test("convert kicad_mod to a footprinter string", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const modPath = path.join(tmpDir, "R_01005_0402Metric.kicad_mod")
  await writeFile(modPath, kicadMod)

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci convert ${modPath} --footprinter`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Copper IoU:")
  expect(stdout).toMatch(/(?:res|cap|01005|0402)/)
})

test("convert a TSX component to a footprinter string with --footprinter", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const componentPath = path.join(tmpDir, "TestResistor.tsx")
  await writeFile(
    componentPath,
    `
export default () => (
  <resistor
    name="R1"
    resistance="1k"
    footprint="res_p1.3mm_pw0.55mm_ph0.7mm"
  />
)
`,
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci convert ${componentPath} --footprinter`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("res_p1.3mm_pw0.55mm_ph0.7mm")
  expect(stdout).toContain("Copper IoU: 100.00%")
})

test("convert rejects TSX footprinter discovery without --footprinter", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const componentPath = path.join(tmpDir, "TestResistor.tsx")
  await writeFile(componentPath, "export default () => <resistor />")

  const { stderr, exitCode } = await runCommand(`tsci convert ${componentPath}`)

  expect(exitCode).toBe(1)
  expect(stderr).toContain("Use --footprinter")
})
