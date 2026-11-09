import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { join, resolve } from "node:path"
import { gzipSync } from "node:zlib"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const fixtures = resolve("tests/cli/simulate/fixtures")
const preload = join(fixtures, "mock-signal-integrity-pipeline.ts")

const setup = async (env?: Record<string, string>) => {
  const fixture = await getCliTestFixture({ preload, env })
  const { tmpDir } = fixture
  await symlink(resolve("node_modules"), join(tmpDir, "node_modules"), "dir")
  await copyFile(
    join(fixtures, "signal-integrity.circuit.tsx"),
    join(tmpDir, "board.circuit.tsx"),
  )
  await mkdir(join(tmpDir, "models"))
  const model = process.env.TSCI_TEST_IBIS_PATH
    ? await readFile(process.env.TSCI_TEST_IBIS_PATH)
    : await (async () => {
        const response = await fetch("https://www.ti.com/lit/zip/scem216c")
        if (!response.ok)
          throw new Error(`TI IBIS download failed: ${response.status}`)
        const archive = await JSZip.loadAsync(await response.arrayBuffer())
        return archive
          .file("SN74LVC1G04_IBIS/sn74lvc1g04.ibs")!
          .async("nodebuffer")
      })()
  expect(createHash("sha256").update(model).digest("hex")).toBe(
    "03033638d7fe8bf268428be133a5aad63aae0145980113561b20ab92063e2c00",
  )
  await writeFile(join(tmpDir, "models/sn74lvc1g04.ibs"), model)
  const transceiver = process.env.TSCI_TEST_TRANSCEIVER_IBIS_PATH
    ? await readFile(process.env.TSCI_TEST_TRANSCEIVER_IBIS_PATH)
    : await (async () => {
        const response = await fetch("https://www.ti.com/lit/zip/sllm183")
        if (!response.ok)
          throw new Error(`TI IBIS download failed: ${response.status}`)
        const archive = await JSZip.loadAsync(await response.arrayBuffer())
        return archive.file("SN65HVD72_IBIS/sn65hvd72.ibs")!.async("nodebuffer")
      })()
  expect(createHash("sha256").update(transceiver).digest("hex")).toBe(
    "293f71f8d6c8764914a73564ebbb5b9e0e706d9dcc18d87aae91f1def06ca47e",
  )
  await writeFile(join(tmpDir, "models/sn65hvd72.ibs"), transceiver)
  return fixture
}

test("simulate discovers a Level 1 TSX block, prints waveform samples, and writes all pipeline records", async () => {
  const { tmpDir, runCommand } = await setup()
  const result = await runCommand(
    "tsci simulate board.circuit.tsx --disable-parts-engine",
  )
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("PCB transient channel simulation:")
  expect(result.stdout).toContain("  DATA\n")
  expect(result.stdout).toContain("far, 2 samples")
  const input = await Bun.file(join(tmpDir, "pipeline-input.json")).json()
  expect(
    input.filter(
      (record: any) => record.type === "simulation_signal_integrity",
    ),
  ).toHaveLength(1)
  const signal = input.find(
    (record: any) => record.type === "simulation_signal",
  )
  expect(signal.driver).toEqual({
    kind: "single",
    source_port_id: expect.any(String),
  })
  expect(
    input.find((record: any) => record.type === "simulation_signal_integrity")
      .corner,
  ).toBe("typical")
  expect(input.some((record: any) => record.type === "source_component")).toBe(
    true,
  )
  const [report] = await readdir(join(tmpDir, ".tscircuit"))
  expect(report).toStartWith("simulation-board-")
  const records = await Bun.file(
    join(tmpDir, ".tscircuit", report, "results.circuit.json"),
  ).json()
  expect(records.slice(0, input.length)).toEqual(input)
  expect(signal).not.toHaveProperty("mask")
  expect(signal).not.toHaveProperty("strobe_simulation_signal_id")
  const waveform = records.find(
    (record: any) => record.type === "simulation_signal_waveform",
  )
  expect(waveform).not.toHaveProperty("idle_voltage_v")
  const csv = await readFile(
    join(tmpDir, ".tscircuit", report, "waveforms.csv"),
    "utf8",
  )
  expect(csv).toContain(
    "simulation_signal_id,end,source_port_id,time_s,voltage_v,idle_voltage_v",
  )
  expect(csv).toContain(
    `${signal.simulation_signal_id},far,${waveform.source_port_id},0,0,`,
  )

  expect(
    records
      .slice(input.length)
      .map((record: any) => record.type)
      .sort(),
  ).toEqual(["simulation_signal_integrity_rlgc", "simulation_signal_waveform"])
  expect(
    await Bun.file(
      join(tmpDir, ".tscircuit", report, "blocks/summary.json"),
    ).exists(),
  ).toBe(true)

  // Plain and compressed Circuit JSON from the same TSX follow the same path.
  for (const suffix of ["json", "json.gz"]) {
    await rm(join(tmpDir, "pipeline-input.json"))
    await writeFile(
      join(tmpDir, `board.${suffix}`),
      suffix.endsWith("gz")
        ? gzipSync(JSON.stringify(input))
        : JSON.stringify(input),
    )
    await mkdir(join(tmpDir, `report-${suffix}`, "blocks"), { recursive: true })
    await writeFile(
      join(tmpDir, `report-${suffix}`, "results.circuit.json"),
      "old results",
    )
    await writeFile(
      join(tmpDir, `report-${suffix}`, "blocks/old-waveform.csv"),
      "stale",
    )
    const result = await runCommand(
      `tsci simulate board.${suffix} --output report-${suffix}`,
    )
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("far, 2 samples")
    expect(
      await Bun.file(
        join(tmpDir, `report-${suffix}`, "results.circuit.json"),
      ).json(),
    ).toEqual(records)
    expect(
      await Bun.file(
        join(tmpDir, `report-${suffix}`, "blocks/old-waveform.csv"),
      ).exists(),
    ).toBe(false)
  }
}, 60_000)

test("simulate runs all blocks in one pipeline call and groups quiet and switching waveforms", async () => {
  const { tmpDir, runCommand } = await setup()
  await writeFile(
    join(tmpDir, "multi.circuit.tsx"),
    `import { simulation } from "@tscircuit/core"
import { SignalIntegrityBoard } from "./board.circuit"
export default () => <SignalIntegrityBoard clock>
  <simulation.pcbtransientchannelsimulation name="WRITE" bitRate="20Mbps" corner="minimum" unrouted="ideal" pdn="ideal">
    <simulation.pcbchannel name="DQS" driverRef=".CLK_TX > .Y" receiverRef=".RX > .CLK" pattern="clock" />
    <simulation.pcbchannel name="DATA" driverRef=".TX > .Y" receiverRef=".RX > .A" />
  </simulation.pcbtransientchannelsimulation>
  <simulation.pcbtransientchannelsimulation name="QUIET" bitRate="20Mbps" corner="maximum" unrouted="ideal" pdn="ideal">
    <simulation.pcbchannel name="DATA" driverRef=".TX > .Y" receiverRef={[".RX > .A", ".RX2 > .A"]} quiet="low" />
  </simulation.pcbtransientchannelsimulation>
</SignalIntegrityBoard>`,
  )
  const result = await runCommand(
    "tsci simulate multi.circuit.tsx --disable-parts-engine --output report",
  )
  expect(result.exitCode).toBe(0)
  const [write, quiet] = result.stdout.split(
    "PCB transient channel simulation: QUIET",
  )
  expect(write).toContain("PCB transient channel simulation: WRITE")
  expect(write).toContain("  DQS\n")
  expect(write).toContain("  DATA\n")
  expect(write).toContain("far, 2 samples")
  expect(quiet).toContain("  DATA\n")
  expect(quiet).toContain("near, 2 samples, idle voltage 0.1000 V")
  expect(quiet.match(/far, 2 samples, idle voltage 0.1000 V/g)).toHaveLength(2)
  const input = await Bun.file(join(tmpDir, "pipeline-input.json")).json()
  expect(
    input.filter(
      (record: any) => record.type === "simulation_signal_integrity",
    ),
  ).toHaveLength(2)
  expect(
    input.find(
      (record: any) =>
        record.type === "simulation_signal_integrity" &&
        record.name === "WRITE",
    ).corner,
  ).toBe("minimum")
  expect(
    input.find(
      (record: any) =>
        record.type === "simulation_signal_integrity" &&
        record.name === "QUIET",
    ).corner,
  ).toBe("maximum")
  const results = await Bun.file(
    join(tmpDir, "report/results.circuit.json"),
  ).json()
  const quietBlock = input.find(
    (record: any) =>
      record.type === "simulation_signal_integrity" && record.name === "QUIET",
  )
  const quietSignal = input.find(
    (record: any) =>
      record.type === "simulation_signal" &&
      record.simulation_signal_integrity_id ===
        quietBlock.simulation_signal_integrity_id,
  )
  const quietWaveforms = results.filter(
    (record: any) =>
      record.type === "simulation_signal_waveform" &&
      record.simulation_signal_id === quietSignal.simulation_signal_id,
  )
  expect(quietWaveforms).toHaveLength(3)
  expect(
    quietWaveforms.map((waveform: any) => waveform.idle_voltage_v),
  ).toEqual([0.1, 0.1, 0.1])
  for (const endpoint of [quietSignal.driver, ...quietSignal.receivers])
    expect(quiet).toContain(`${endpoint.source_port_id}:`)
}, 60_000)

// Requires ngspice; excluded from solver-free verification.
for (const pipelinePreload of [preload, undefined])
  test(`simulate without SI runs ngspice (${pipelinePreload ? "mocked" : "real"} empty pipeline)`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture({
      preload: pipelinePreload,
    })
    await writeFile(
      join(tmpDir, "analog.tsx"),
      `export default () => <board width={10} height={10} routingDisabled schematicDisabled>
    <voltagesource name="V1" voltage="3.3V" />
    <resistor name="R1" resistance="1k" footprint="0603" />
    <trace from=".V1 > .pin1" to=".R1 > .pin1" />
    <trace from=".V1 > .pin2" to=".R1 > .pin2" />
    <trace from=".V1 > .pin2" to="net.GND" />
  </board>`,
    )
    const result = await runCommand(
      "tsci simulate analog.tsx --disable-parts-engine --output unused-report",
    )
    expect(result.exitCode).toBe(0)
    expect(result.stdout).not.toContain("PCB transient channel simulation:")
    expect(result.stdout).toContain("Index  time")
    expect(await Bun.file(join(tmpDir, ".tscircuit")).exists()).toBe(false)
    expect(await Bun.file(join(tmpDir, "unused-report")).exists()).toBe(false)
    if (pipelinePreload) {
      const input = await Bun.file(join(tmpDir, "pipeline-input.json")).json()
      expect(
        input.some((record: any) => record.type === "source_component"),
      ).toBe(true)
      expect(
        input.some(
          (record: any) => record.type === "simulation_signal_integrity",
        ),
      ).toBe(false)
    }
  }, 30_000)

test("a failed report write leaves the previous report intact", async () => {
  const { tmpDir, runCommand } = await setup({
    TSCI_TEST_INVALID_ARTIFACT: "1",
  })
  await mkdir(join(tmpDir, "report"))
  await writeFile(
    join(tmpDir, "report/results.circuit.json"),
    "previous results",
  )
  await writeFile(join(tmpDir, "report/previous.csv"), "previous waveform")
  const result = await runCommand(
    "tsci simulate board.circuit.tsx --disable-parts-engine --output report",
  )
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain(
    "Expected a safe project-relative file path: ../outside.txt",
  )
  expect(result.stdout).not.toContain("PCB transient channel simulation:")
  expect(
    await readFile(join(tmpDir, "report/results.circuit.json"), "utf8"),
  ).toBe("previous results")
  expect(await readdir(join(tmpDir, "report"))).toEqual([
    "previous.csv",
    "results.circuit.json",
  ])
  expect(
    (await readdir(tmpDir)).some((name) => name.startsWith(".report-")),
  ).toBe(false)
  expect(await Bun.file(join(tmpDir, "outside.txt")).exists()).toBe(false)
}, 60_000)

test("simulate rejects removed modeling entries and native solver options", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({ preload })
  await writeFile(
    join(tmpDir, "entry.json"),
    JSON.stringify({ circuit: "missing.json", modeling: {} }),
  )
  const entry = await runCommand("tsci simulate entry.json")
  expect(entry.exitCode).not.toBe(0)
  expect(entry.stderr).toContain("Expected an array of Circuit JSON records")
  const option = await runCommand(
    "tsci simulate missing.tsx --solver-timeout-ms 1000",
  )
  expect(option.exitCode).not.toBe(0)
  expect(option.stderr).toContain("unknown option '--solver-timeout-ms'")
}, 30_000)
