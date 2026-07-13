import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

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
