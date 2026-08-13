import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const overlappingResistorsFixturePath = path.resolve(
  import.meta.dir,
  "../../fixtures/check-placement/overlapping-0402-resistors.tsx",
)

const cleanPlacementCircuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <resistor resistance="1k" footprint="0402" name="R2" pcbX={2} pcbY={0} />
  </board>
)
`

const connectorIntrusionCircuitJson = [
  {
    type: "source_component",
    source_component_id: "source_usb1",
    name: "USB1",
    ftype: "chip",
  },
  {
    type: "source_component",
    source_component_id: "source_c1",
    name: "C1",
    ftype: "simple_capacitor",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_usb1",
    source_component_id: "source_usb1",
    center: { x: 0, y: 0 },
    width: 4,
    height: 3,
    layer: "top",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_c1",
    source_component_id: "source_c1",
    center: { x: 1, y: 0 },
    width: 2,
    height: 1,
    layer: "top",
  },
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
  },
]

const scopedPlacementCircuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={0} pcbY={0} />
    <resistor resistance="1k" footprint="0402" name="R2" pcbX={0} pcbY={0} />
    <resistor resistance="1k" footprint="0402" name="R3" pcbX={3} pcbY={0} />
  </board>
)
`

const writeCircuit = async (tmpDir: string, fileName: string, code: string) => {
  const circuitPath = path.join(tmpDir, fileName)
  await writeFile(circuitPath, code)
  return circuitPath
}

test("check placement exits zero for clean placement", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = await writeCircuit(
    tmpDir,
    "clean-placement.tsx",
    cleanPlacementCircuitCode,
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check placement ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("no placement issues")
  expect(stdout).toContain("Errors: 0")
})

test("check placement exits nonzero for pad and courtyard overlap", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stdout, exitCode } = await runCommand(
    `tsci check placement ${overlappingResistorsFixturePath}`,
  )

  expect(exitCode).not.toBe(0)
  expect(stdout).toContain("placement summary: 1 pad overlap")
  expect(stdout).toContain("pcb_courtyard_overlap_error")
})

test("check placement exits nonzero for connector intrusion", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "connector-intrusion.circuit.json")
  await writeFile(circuitPath, JSON.stringify(connectorIntrusionCircuitJson))

  const { stdout, exitCode } = await runCommand(
    `tsci check placement ${circuitPath}`,
  )

  expect(exitCode).not.toBe(0)
  expect(stdout).toContain("connector-body intrusion")
  expect(stdout).toContain("Errors: 0")
})

test("check placement exits zero for warning-only diagnostics", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "placement-warning.circuit.json")
  await writeFile(
    circuitPath,
    JSON.stringify([
      {
        type: "pcb_connector_not_in_accessible_orientation_warning",
        warning_type: "pcb_connector_not_in_accessible_orientation_warning",
        message: "Connector J1 does not face an accessible board edge",
        component_name: "J1",
      },
    ]),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check placement ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Errors: 0")
  expect(stdout).toContain("Warnings: 1")
})

test("check placement exit status only considers the requested refdes", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = await writeCircuit(
    tmpDir,
    "scoped-placement.tsx",
    scopedPlacementCircuitCode,
  )

  const cleanScope = await runCommand(`tsci check placement ${circuitPath} R3`)
  const failingScope = await runCommand(
    `tsci check placement ${circuitPath} R1`,
  )

  expect(cleanScope.exitCode).toBe(0)
  expect(cleanScope.stdout).toContain("R3")
  expect(cleanScope.stdout).not.toContain("R1 and R2 pad overlap")
  expect(failingScope.exitCode).not.toBe(0)
  expect(failingScope.stdout).toContain("pcb_smtpad R1.pin1 overlaps")
}, 20_000)
