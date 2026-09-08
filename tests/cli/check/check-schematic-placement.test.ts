import { expect, test } from "bun:test"
import { readFile, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { checkSchematicPlacement } from "../../../cli/check/schematic-placement/register"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="20mm" height="10mm">
    <resistor resistance="1k" name="R1" schX={0} schY={0} />
    <capacitor capacitance="1000pF" name="C1" schX={0.2} schY={0} />
    <trace from=".R1 > .pin2" to=".C1 > .pin1" />
  </board>
)
`

const misalignedPinPairsCircuitJson = [
  {
    type: "source_component",
    source_component_id: "source_component_1",
    name: "U1",
    ftype: "simple_chip",
  },
  {
    type: "source_component",
    source_component_id: "source_component_2",
    name: "U2",
    ftype: "simple_chip",
  },
  {
    type: "schematic_component",
    schematic_component_id: "schematic_component_1",
    source_component_id: "source_component_1",
    center: { x: -3, y: 0 },
    size: { width: 2, height: 1 },
    rotation: 0,
  },
  {
    type: "schematic_component",
    schematic_component_id: "schematic_component_2",
    source_component_id: "source_component_2",
    center: { x: 3, y: 1 },
    size: { width: 2, height: 1 },
    rotation: 0,
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_1",
    schematic_component_id: "schematic_component_1",
    source_port_id: "source_port_1",
    center: { x: -2, y: 0.1 },
    facing_direction: "right",
    pin_number: 1,
    display_pin_label: "SCL",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_2",
    schematic_component_id: "schematic_component_1",
    source_port_id: "source_port_2",
    center: { x: -2, y: -0.1 },
    facing_direction: "right",
    pin_number: 2,
    display_pin_label: "SDA",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_3",
    schematic_component_id: "schematic_component_2",
    source_port_id: "source_port_3",
    center: { x: 2, y: 1.1 },
    facing_direction: "left",
    pin_number: 1,
    display_pin_label: "SCL",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_4",
    schematic_component_id: "schematic_component_2",
    source_port_id: "source_port_4",
    center: { x: 2, y: 0.9 },
    facing_direction: "left",
    pin_number: 2,
    display_pin_label: "SDA",
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_1",
    source_trace_id: "source_trace_1",
    edges: [{ from: { x: -2, y: 0.1 }, to: { x: 2, y: 1.1 } }],
    junctions: [],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_2",
    source_trace_id: "source_trace_2",
    edges: [{ from: { x: -2, y: -0.1 }, to: { x: 2, y: 0.9 } }],
    junctions: [],
  },
]

test("tsci check schematic-placement prints schematic placement analysis", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const circuitPath = path.join(
    process.cwd(),
    `tmp-check-schematic-placement-${Date.now()}-${Math.random().toString(36).slice(2)}.tsx`,
  )

  try {
    await writeFile(circuitPath, circuitCode)

    const expected = await checkSchematicPlacement(circuitPath)

    const { stdout, stderr, exitCode } = await runCommand(
      `tsci check schematic-placement ${circuitPath}`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(stdout.trim()).toContain(expected.output)
    expect(stdout).toContain("<SchematicBoxPositions>")
    expect(stdout).toContain('componentName="R1"')
    expect(stdout).toContain('componentName="C1"')
    const outputDir = path.join(tmpDir, "dist", "schematic-placement")
    expect((await readdir(outputDir)).sort()).toEqual(
      expected.artifacts.map((artifact) => artifact.fileName).sort(),
    )
    expect(expected.artifacts.length).toBeGreaterThan(0)
    for (const artifact of expected.artifacts) {
      const svg = await readFile(
        path.join(outputDir, artifact.fileName),
        "utf8",
      )
      expect(svg).toBe(artifact.content)
      expect(svg.match(/data-issue-index=/g)).toHaveLength(1)
      expect(stdout).toContain(path.join(outputDir, artifact.fileName))
    }
    // A later clean result removes stale generated reports but keeps user files.
    await writeFile(path.join(outputDir, "notes.svg"), "keep this")
    const cleanCircuitPath = path.join(tmpDir, "clean.circuit.json")
    await writeFile(cleanCircuitPath, "[]")
    const clean = await runCommand(
      `tsci check schematic-placement ${cleanCircuitPath}`,
    )
    expect(clean.exitCode).toBe(0)
    expect(clean.stderr).toBe("")
    expect(await readdir(outputDir)).toEqual(["notes.svg"])
    expect(await readFile(path.join(outputDir, "notes.svg"), "utf8")).toBe(
      "keep this",
    )
  } finally {
    await rm(circuitPath, { force: true })
  }
}, 20_000)

test("tsci check schematic-placement reports a better vertical pin alignment", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "misaligned-pins.circuit.json")
  await writeFile(circuitPath, JSON.stringify(misalignedPinPairsCircuitJson))

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check schematic-placement ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain(
    '<ComponentPinsWouldAlignWithVerticalShift firstComponentName="U1" secondComponentName="U2" targetComponentName="U2" deltaSchY="-1" newSchY="0" currentlyAlignedPinCount="0" alignedPinCount="2"',
  )
})

test("tsci check schematic-placement creates no artifact directory for a clean circuit", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "clean.circuit.json")
  await writeFile(circuitPath, "[]")
  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check schematic-placement ${circuitPath}`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout.trim()).toBe("")
  expect(
    await readdir(path.join(tmpDir, "dist", "schematic-placement")).catch(
      (error) => error.code,
    ),
  ).toBe("ENOENT")
})
