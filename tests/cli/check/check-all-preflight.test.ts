import { expect, test } from "bun:test"
import { symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { appendCopperBridgeTrace } from "@tscircuit/check-shorts"
import { getCircuitJsonForCheck } from "../../../cli/check/shared"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const writeCircuitJson = async (
  tmpDir: string,
  name: string,
  elements: Array<Record<string, unknown>>,
) => {
  const circuitJsonPath = path.join(tmpDir, `${name}.circuit.json`)
  await writeFile(circuitJsonPath, JSON.stringify(elements))
  return circuitJsonPath
}

const warningOnlyElements = [
  {
    type: "source_property_ignored_warning",
    message: "Property ignored on R1",
  },
]

const errorElements = [
  {
    type: "source_pin_must_be_connected_error",
    message: "Pin 1 on U1 must be connected",
  },
  {
    type: "source_pin_must_be_connected_error",
    message: "Pin 1 on U1 must be connected",
  },
  {
    type: "source_property_ignored_warning",
    message: "Property ignored on R1",
  },
]

test("check all passes a clean circuit in every format", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitJsonPath = await writeCircuitJson(tmpDir, "clean", [])

  const text = await runCommand(`tsci check all ${circuitJsonPath}`)
  expect(text.exitCode).toBe(0)
  expect(text.stdout).toContain("Preflight: PASS (fail-on: error)")
  expect(text.stdout).toContain("Errors: 0")
  expect(text.stdout).toContain("Warnings: 0")

  const json = await runCommand(
    `tsci check all ${circuitJsonPath} --format json --fail-on warning`,
  )
  expect(json.exitCode).toBe(0)
  expect(JSON.parse(json.stdout)).toEqual({
    ok: true,
    failOn: "warning",
    file: "clean.circuit.json",
    summary: { errors: 0, warnings: 0, byCategory: {} },
    diagnostics: [],
  })

  const sarif = await runCommand(
    `tsci check all ${circuitJsonPath} --format sarif`,
  )
  expect(sarif.exitCode).toBe(0)
  const sarifLog = JSON.parse(sarif.stdout)
  expect(sarifLog.version).toBe("2.1.0")
  expect(sarifLog.runs[0].tool.driver.name).toBe("tsci check all")
  expect(sarifLog.runs[0].results).toEqual([])
}, 20_000)

test("check all --fail-on warning fails on warnings that pass by default", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitJsonPath = await writeCircuitJson(
    tmpDir,
    "warning-only",
    warningOnlyElements,
  )

  const defaultRun = await runCommand(`tsci check all ${circuitJsonPath}`)
  expect(defaultRun.exitCode).toBe(0)
  expect(defaultRun.stdout).toContain("Preflight: PASS")
  expect(defaultRun.stdout).toContain(
    "- [warning] source/source_property_ignored_warning: Property ignored on R1",
  )

  const strictRun = await runCommand(
    `tsci check all ${circuitJsonPath} --format json --fail-on warning`,
  )
  expect(strictRun.exitCode).toBe(1)
  const report = JSON.parse(strictRun.stdout)
  expect(report.ok).toBe(false)
  expect(report.failOn).toBe("warning")
  expect(report.summary).toEqual({
    errors: 0,
    warnings: 1,
    byCategory: { source: { errors: 0, warnings: 1 } },
  })
}, 20_000)

test("check all fails on errors, dedupes them, and emits SARIF results", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitJsonPath = await writeCircuitJson(
    tmpDir,
    "errors",
    errorElements,
  )

  const json = await runCommand(
    `tsci check all ${circuitJsonPath} --format json`,
  )
  expect(json.exitCode).toBe(1)
  const report = JSON.parse(json.stdout)
  expect(report.ok).toBe(false)
  expect(report.summary.errors).toBe(1)
  expect(report.summary.warnings).toBe(1)
  expect(report.diagnostics[0]).toEqual({
    severity: "error",
    category: "netlist",
    type: "source_pin_must_be_connected_error",
    message: "Pin 1 on U1 must be connected",
  })

  const sarif = await runCommand(
    `tsci check all ${circuitJsonPath} --format sarif --fail-on none`,
  )
  expect(sarif.exitCode).toBe(0)
  const run = JSON.parse(sarif.stdout).runs[0]
  expect(run.tool.driver.rules.map((rule: { id: string }) => rule.id)).toEqual([
    "source_pin_must_be_connected_error",
    "source_property_ignored_warning",
  ])
  expect(
    run.results.map((result: { level: string; ruleId: string }) => [
      result.level,
      result.ruleId,
    ]),
  ).toEqual([
    ["error", "source_pin_must_be_connected_error"],
    ["warning", "source_property_ignored_warning"],
  ])
  expect(
    run.results[0].locations[0].physicalLocation.artifactLocation.uri,
  ).toBe("errors.circuit.json")
}, 20_000)

test("check all rejects unknown --format and --fail-on values", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitJsonPath = await writeCircuitJson(tmpDir, "clean", [])

  const badFormat = await runCommand(
    `tsci check all ${circuitJsonPath} --format xml`,
  )
  expect(badFormat.exitCode).toBe(1)
  expect(badFormat.stderr).toContain(
    "--format must be one of: text, json, sarif",
  )

  const badFailOn = await runCommand(
    `tsci check all ${circuitJsonPath} --fail-on info`,
  )
  expect(badFailOn.exitCode).toBe(1)
  expect(badFailOn.stderr).toContain(
    "--fail-on must be one of: error, warning, none",
  )
}, 20_000)

test("check all reports copper shorts as errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "shorted-board.tsx")
  await symlink(
    path.join(process.cwd(), "node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
  await writeFile(
    circuitPath,
    `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={2} pcbY={0} />
  </board>
)
`,
  )
  const circuitJson = appendCopperBridgeTrace(
    await getCircuitJsonForCheck({
      filePath: circuitPath,
      platformConfig: { pcbDisabled: false, routingDisabled: true },
    }),
    { start: { x: -2.2, y: 0 }, end: { x: 2.2, y: 0 }, width: 0.25 },
  )
  const circuitJsonPath = path.join(tmpDir, "shorted-board.circuit.json")
  await writeFile(circuitJsonPath, JSON.stringify(circuitJson))

  const { stdout, exitCode } = await runCommand(
    `tsci check all ${circuitJsonPath} --format json`,
  )
  const report = JSON.parse(stdout)

  expect(exitCode).toBe(1)
  expect(report.summary.byCategory.shorts.errors).toBeGreaterThan(0)
  expect(
    report.diagnostics.find(
      (diagnostic: { category: string }) => diagnostic.category === "shorts",
    ),
  ).toMatchObject({ severity: "error", type: "copper_short" })
}, 30_000)
