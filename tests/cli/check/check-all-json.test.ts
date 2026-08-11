import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("check --all --format=json returns one deduplicated machine-readable report", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitJsonPath = path.join(tmpDir, "all-checks.circuit.json")

  await writeFile(
    circuitJsonPath,
    JSON.stringify([
      {
        type: "source_component",
        source_component_id: "source_component_1",
        name: "U1",
      },
      {
        type: "pcb_component",
        pcb_component_id: "pcb_component_1",
        source_component_id: "source_component_1",
        center: { x: 12, y: 8 },
        width: 2,
        height: 2,
        layer: "top",
      },
      {
        type: "source_pin_must_be_connected_error",
        source_component_id: "source_component_1",
        message: "U1 pin 1 must be connected",
        suggested_fix: "connect U1 pin 1",
      },
      {
        type: "source_pin_must_be_connected_error",
        source_component_id: "source_component_1",
        message: "U1 pin 1 must be connected",
        suggested_fix: "connect U1 pin 1",
      },
    ]),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check ${circuitJsonPath} --all --format=json`,
  )
  const report = JSON.parse(stdout)

  expect(exitCode).toBe(1)
  expect(stderr).toBe("")
  expect(report.schema_version).toBe(1)
  expect(report.success).toBe(false)
  expect(report.checks.map((check: { name: string }) => check.name)).toEqual([
    "netlist",
    "schematic_placement",
    "pcb_placement",
    "shorts",
    "routing",
    "build",
  ])
  expect(report.issues).toContainEqual({
    category: "netlist",
    type: "source_pin_must_be_connected_error",
    severity: "error",
    message: "U1 pin 1 must be connected",
    component_names: ["U1"],
    coordinates: {
      x: 12,
      y: 8,
      unit: "mm",
      space: "pcb",
    },
    suggested_fix: "connect U1 pin 1",
  })
  expect(
    report.issues.filter(
      (issue: { type: string }) =>
        issue.type === "source_pin_must_be_connected_error",
    ),
  ).toHaveLength(1)
})

test("check rejects json format without --all", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stderr, exitCode } = await runCommand("tsci check --format=json")

  expect(exitCode).toBe(1)
  expect(stderr).toContain("--format=json requires --all")
})

test("check --all keeps build failures machine readable", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stdout, stderr, exitCode } = await runCommand(
    "tsci check missing.circuit.tsx --all --format=json",
  )
  const report = JSON.parse(stdout)

  expect(exitCode).toBe(1)
  expect(stderr).toBe("")
  expect(report.success).toBe(false)
  expect(report.issues).toEqual([
    expect.objectContaining({
      category: "build",
      type: "build_validation_error",
      severity: "error",
    }),
  ])
})
