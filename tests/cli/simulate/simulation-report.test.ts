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

// Characterize the current failures without making unrelated CI permanently red.
test("reproduces a successful exit after an aborted ngspice analysis", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const filename = path.join(tmpDir, "shorted-source.json")
  await writeFile(filename, JSON.stringify(supplyCircuit(true)))
  const run = await runCommand(`tsci simulate ${filename}`)
  const diagnostics = [
    ...new Set(
      `${run.stdout}\n${run.stderr}`
        .split("\n")
        .map((line) => line.trim())
        .filter((line) =>
          /^(Warning: singular matrix:|doAnalyses:|run simulation\(s\) aborted|Warning from checkvalid:|Error during)/.test(
            line,
          ),
        ),
    ),
  ]
  expect({ exitCode: run.exitCode, diagnostics }).toMatchInlineSnapshot(`
    {
      "diagnostics": [
        "Warning: singular matrix:  check node vsupply#branch",
        "doAnalyses: TRAN:  Timestep too small; initial timepoint: cause unrecorded.",
        "run simulation(s) aborted",
        "Warning from checkvalid: vector time is not available or has zero length.",
        "Error during 'write': no writable vector found.",
      ],
      "exitCode": 0,
    }
  `)
}, 30000)

test("reproduces rejection of the requested JSON output format", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const filename = path.join(tmpDir, "precision.json")
  await writeFile(filename, JSON.stringify(supplyCircuit(false)))
  const run = await runCommand(`tsci simulate ${filename} --format json`)
  expect({
    exitCode: run.exitCode,
    stdout: run.stdout.trim(),
    stderr: run.stderr.trim(),
  }).toMatchInlineSnapshot(`
    {
      "exitCode": 1,
      "stderr": "error: unknown option '--format'",
      "stdout": "",
    }
  `)
}, 30000)
