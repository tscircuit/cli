import { expect, test } from "bun:test"
import fs from "node:fs"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const focusedSnapshotCircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 40,
    height: 20,
    material: "fr4",
    thickness: 1.6,
    num_layers: 2,
  },
  {
    type: "source_component",
    source_component_id: "source_component_0",
    name: "U1",
    ftype: "simple_chip",
  },
  {
    type: "source_component",
    source_component_id: "source_component_1",
    name: "U2",
    ftype: "simple_chip",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    center: { x: -10, y: 0 },
    width: 4,
    height: 4,
    layer: "top",
    rotation: 0,
    obstructs_within_bounds: true,
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    center: { x: 10, y: 0 },
    width: 4,
    height: 4,
    layer: "top",
    rotation: 0,
    obstructs_within_bounds: true,
  },
]

test("snapshot command crops a PCB snapshot around a named chip", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitJsonPath = join(tmpDir, "two-chips.circuit.json")
  await Bun.write(circuitJsonPath, JSON.stringify(focusedSnapshotCircuitJson))

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci snapshot two-chips.circuit.json --update --chip U1 --chip-padding 3",
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Created snapshots")
  expect(stdout).toContain(
    `✅ ${join("__snapshots__", "two-chips.circuit-pcb-U1.snap.svg")}`,
  )

  const snapshotDir = join(tmpDir, "__snapshots__")
  expect(
    fs.existsSync(join(snapshotDir, "two-chips.circuit-pcb-U1.snap.svg")),
  ).toBe(true)
  expect(
    fs.existsSync(join(snapshotDir, "two-chips.circuit-schematic.snap.svg")),
  ).toBe(false)
})

test("snapshot command reports available components for an unknown chip", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "two-chips.circuit.json"),
    JSON.stringify(focusedSnapshotCircuitJson),
  )

  const { stderr, exitCode } = await runCommand(
    "tsci snapshot two-chips.circuit.json --update --chip U3",
  )

  expect(exitCode).toBe(1)
  expect(stderr).toContain(
    'PCB component "U3" was not found. Available PCB components: U1, U2.',
  )
})
