import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const kicadMod = `
(footprint "TwoPad"
	(version 20260206)
	(layer "F.Cu")
	(attr smd)
	(pad "1" smd rect
		(at -0.25 0)
		(size 0.4 0.3)
		(layers "F.Cu" "F.Mask")
	)
	(pad "2" smd rect
		(at 0.25 0)
		(size 0.4 0.3)
		(layers "F.Cu" "F.Mask")
	)
)
`

test("inspect footprint prints the pads of a footprinter string", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci inspect footprint soic8",
  )

  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  expect(stdout).toContain("source: footprinter string")
  expect(stdout).toContain("parameters: fn=soic num_pins=8")
  expect(stdout).toContain("pads: 8 SMT pads")
  expect(stdout).toContain("copper: 5.3 x 4.41 mm")

  const rows = stdout
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((cells) => cells[1] === "smtpad")
  expect(rows.map((cells) => cells[0])).toEqual([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
  ])
  // pin, kind, shape, x, y, width, height, hole, layers
  expect(rows[0]).toEqual([
    "1",
    "smtpad",
    "rect",
    "-2.15",
    "1.905",
    "1",
    "0.6",
    "-",
    "top",
  ])
  expect(rows[4]!.slice(3, 5)).toEqual(["2.15", "-1.905"])
}, 30_000)

test("inspect footprint --json reports holes for a through-hole string", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci inspect footprint pinrow4 --json",
  )

  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  const inspection = JSON.parse(stdout)
  expect(inspection.source).toBe("footprinter_string")
  expect(inspection.parameters.num_pins).toBe(4)
  expect(inspection.padCounts).toEqual({ smtpad: 0, plated_hole: 4, hole: 0 })
  expect(inspection.pads).toHaveLength(4)
  expect(inspection.pads[0]).toMatchObject({
    pin: ["1"],
    kind: "plated_hole",
    x: -3.81,
    y: 0,
    hole: { width: 1, height: 1 },
    layers: ["top", "bottom"],
  })
  expect(inspection.copperBounds.width).toBeCloseTo(9.12)
}, 30_000)

test("inspect footprint reads a .kicad_mod file", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const modPath = path.join(tmpDir, "two-pad.kicad_mod")
  await writeFile(modPath, kicadMod)

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci inspect footprint ${modPath} --json`,
  )

  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  const inspection = JSON.parse(stdout)
  expect(inspection.source).toBe("file")
  expect(inspection.parameters).toBeUndefined()
  expect(inspection.pads.map((pad: any) => [pad.pin[0], pad.x, pad.y])).toEqual(
    [
      ["1", -0.25, 0],
      ["2", 0.25, 0],
    ],
  )
  expect(inspection.pads[0]).toMatchObject({ width: 0.4, height: 0.3 })
}, 30_000)

test("inspect footprint shows pin labels for a component file", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const componentPath = path.join(tmpDir, "my-chip.tsx")
  await writeFile(
    componentPath,
    `
export default (props: any) => (
  <chip
    {...props}
    footprint="soic8"
    pinLabels={{ pin1: "VCC", pin4: "GND" }}
  />
)
`,
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci inspect footprint ${componentPath} --json`,
  )

  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  const inspection = JSON.parse(stdout)
  expect(inspection.pads.map((pad: any) => pad.pin)).toEqual([
    ["1", "VCC"],
    ["2"],
    ["3"],
    ["4", "GND"],
    ["5"],
    ["6"],
    ["7"],
    ["8"],
  ])
}, 60_000)

test("inspect footprint fails on a string footprinter cannot parse", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci inspect footprint notafootprint9",
  )

  expect(exitCode).toBe(1)
  expect(stdout).toBe("")
  expect(stderr).toContain("Failed to inspect footprint")
  expect(stderr).toContain('"notafootprint9" is not an existing file')
}, 30_000)

test("inspect footprint reports a missing file as a missing file", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const { stderr, exitCode } = await runCommand(
    `tsci inspect footprint ${path.join(tmpDir, "missing.kicad_mod")}`,
  )

  expect(exitCode).toBe(1)
  expect(stderr).toContain("File not found")
}, 30_000)
