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

test("simulate discovers a Level 1 TSX block, prints the eye, and writes all pipeline records", async () => {
  const { tmpDir, runCommand } = await setup()
  const result = await runCommand(
    "tsci simulate board.circuit.tsx --disable-parts-engine",
  )
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("Signal integrity:")
  expect(result.stdout).toContain("  DATA\n")
  expect(result.stdout).toContain(
    "eye height 2.500 V, eye width 4.000e-8 s, mask margin -0.1000 V",
  )
  const input = JSON.parse(
    await readFile(join(tmpDir, "pipeline-input.json"), "utf8"),
  )
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
  expect(input.some((record: any) => record.type === "source_component")).toBe(
    true,
  )
  const [report] = await readdir(join(tmpDir, ".tscircuit"))
  expect(report).toStartWith("simulation-board-")
  const records = JSON.parse(
    await readFile(
      join(tmpDir, ".tscircuit", report, "results.circuit.json"),
      "utf8",
    ),
  )
  expect(records.slice(0, input.length)).toEqual(input)
  expect(
    records
      .slice(input.length)
      .map((record: any) => record.type)
      .sort(),
  ).toEqual([
    "simulation_signal_eye",
    "simulation_signal_integrity_rlgc",
    "simulation_signal_waveform",
  ])
  expect(
    await Bun.file(join(tmpDir, ".tscircuit", report, "results.html")).exists(),
  ).toBe(true)
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
    expect(result.stdout).toContain("eye height 2.500 V")
    expect(
      JSON.parse(
        await readFile(
          join(tmpDir, `report-${suffix}`, "results.circuit.json"),
          "utf8",
        ),
      ),
    ).toEqual(records)
    expect(
      await Bun.file(
        join(tmpDir, `report-${suffix}`, "blocks/old-waveform.csv"),
      ).exists(),
    ).toBe(false)
  }
}, 60_000)

test("simulate runs all blocks in one pipeline call and groups quiet and strobed signals", async () => {
  const { tmpDir, runCommand } = await setup()
  await writeFile(
    join(tmpDir, "multi.circuit.tsx"),
    `import { SignalIntegrityBoard } from "./board.circuit"
export default () => <SignalIntegrityBoard clock>
  <signalintegrity name="WRITE" bitRate="20Mbps" unrouted="ideal" pdn="ideal">
    <signal name="DQS" driver=".CLK_TX > .Y" receiver=".RX > .CLK" pattern="clock" />
    <signal name="DATA" driver=".TX > .Y" receiver=".RX > .A" strobe="DQS" mask={{ setup: "75ps", hold: "100ps" }} />
  </signalintegrity>
  <signalintegrity name="QUIET" bitRate="20Mbps" unrouted="ideal" pdn="ideal">
    <signal name="DATA" driver=".TX > .Y" receiver={[".RX > .A", ".RX2 > .A"]} quiet="low" />
  </signalintegrity>
</SignalIntegrityBoard>`,
  )
  const result = await runCommand(
    "tsci simulate multi.circuit.tsx --disable-parts-engine --output report",
  )
  expect(result.exitCode).toBe(0)
  const [write, quiet] = result.stdout.split("Signal integrity: QUIET")
  expect(write).toContain("Signal integrity: WRITE")
  expect(write).toContain("  DQS\n")
  expect(write).toContain("  DATA\n")
  expect(write).toContain(
    "worst setup margin -2.000e-11 s, worst hold margin 3.000e-11 s",
  )
  expect(quiet).toContain("  DATA\n")
  expect(quiet).toContain(
    "NEXT, idle voltage 0.1000 V, positive peak 0.01200 V, negative peak -0.02500 V",
  )
  expect(quiet).toContain(
    "FEXT, idle voltage 0.1000 V, positive peak 0.02400 V, negative peak -0.05000 V",
  )
  expect(quiet).toContain(
    "FEXT, idle voltage 0.1000 V, positive peak 0.03600 V, negative peak -0.07500 V",
  )
  expect(quiet).not.toContain("eye height")
  const input = JSON.parse(
    await readFile(join(tmpDir, "pipeline-input.json"), "utf8"),
  )
  expect(
    input.filter(
      (record: any) => record.type === "simulation_signal_integrity",
    ),
  ).toHaveLength(2)
  const quietSignal = input.find(
    (record: any) => record.type === "simulation_signal" && record.quiet,
  )
  for (const endpoint of [quietSignal.driver, ...quietSignal.receivers])
    expect(quiet).toContain(`${endpoint.source_port_id}:`)
}, 60_000)

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
    expect(result.stdout).not.toContain("Signal integrity:")
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
  expect(result.stdout).not.toContain("Signal integrity:")
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
