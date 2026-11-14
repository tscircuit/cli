import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import type { AnyCircuitElement } from "circuit-json"

const supplyCircuit = (shorted: boolean): AnyCircuitElement[] => [
  {
    type: "source_component",
    source_component_id: "v1",
    name: "V1",
    ftype: "simple_voltage_source",
    voltage: 1.23456789012345,
  },
  ...["pos", "neg"].map(
    (name, index): AnyCircuitElement => ({
      type: "source_port",
      source_port_id: name,
      source_component_id: "v1",
      name,
      pin_number: index + 1,
    }),
  ),
  {
    type: "source_net",
    source_net_id: "ground",
    name: "GND",
    member_source_group_ids: [],
  },
  {
    type: "source_trace",
    source_trace_id: "return",
    connected_source_port_ids: shorted ? ["pos", "neg"] : ["neg"],
    connected_source_net_ids: ["ground"],
  },
  {
    type: "simulation_voltage_source",
    simulation_voltage_source_id: "supply",
    is_dc_source: true,
    positive_source_port_id: "pos",
    negative_source_port_id: "neg",
    voltage: 1.23456789012345,
  },
]

test("a fatal ngspice error returns a nonzero CLI status", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const filename = path.join(tmpDir, "shorted-source.json")
  await writeFile(filename, JSON.stringify(supplyCircuit(true)))
  const { exitCode, stdout, stderr } = await runCommand(
    `tsci simulate ${filename}`,
  )
  expect(`${stdout}\n${stderr}`).toMatch(/shorted VSRC|aborted|simulation.*failed/i)
  expect(exitCode).not.toBe(0)
}, 30000)

test("JSON reports preserve samples, executed netlist and engine provenance", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const filename = path.join(tmpDir, "precision.json")
  await writeFile(filename, JSON.stringify(supplyCircuit(false)))
  const { exitCode, stdout } = await runCommand(
    `tsci simulate ${filename} --format json`,
  )
  expect(exitCode).toBe(0)
  const report = JSON.parse(stdout)
  expect(report.status).toBe("success")
  expect(report.engine.name).toBe("ngspice")
  expect(report.engine.version).toMatch(/^\d+\.\d+\.\d+$/)
  expect(report.netlist).toContain("1.23456789012345")
  expect(report.netlist_sha256).toMatch(/^[a-f0-9]{64}$/)
  const voltage = report.result.data.find(
    (series: { type: string }) => series.type === "voltage",
  )
  expect(voltage.values[0]).toBe(1.23456789012345)
  expect(report.diagnostics.errors).toEqual([])
}, 30000)
