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

const setup = async () => {
  const fixture = await getCliTestFixture({ preload })
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
  expect(records.map((record: any) => record.type).sort()).toEqual([
    "simulation_signal_eye",
    "simulation_signal_integrity_rlgc",
    "simulation_signal_waveform",
  ])

  // Plain and compressed Circuit JSON from the same TSX follow the same path.
  for (const suffix of ["json", "json.gz"]) {
    await rm(join(tmpDir, "pipeline-input.json"))
    await writeFile(
      join(tmpDir, `board.${suffix}`),
      suffix.endsWith("gz")
        ? gzipSync(JSON.stringify(input))
        : JSON.stringify(input),
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
  }
  const repeat = await runCommand(
    "tsci simulate board.json --output report-json",
  )
  expect(repeat.exitCode).not.toBe(0)
  expect(repeat.stderr).toContain("Use a fresh output directory")
}, 60_000)

test("simulate runs all blocks in one pipeline call and groups quiet and strobed signals", async () => {
  const { tmpDir, runCommand } = await setup()
  await writeFile(
    join(tmpDir, "multi.circuit.tsx"),
    `import { SignalIntegrityBoard } from "./board.circuit"
export default () => <SignalIntegrityBoard clock>
  <signalintegrity name="WRITE" bitRate="20Mbps" unrouted="ideal" pdn="ideal" supply="ibis">
    <signal name="DQS" driver=".CLK_TX > .Y" receiver=".CLK_RX > .A" pattern="clock" />
    <signal name="DATA" driver=".TX > .Y" receiver=".RX > .A" strobe="DQS" mask={{ setup: "75ps", hold: "100ps" }} />
  </signalintegrity>
  <signalintegrity name="QUIET" bitRate="20Mbps" unrouted="ideal" pdn="ideal" supply="ibis">
    <signal name="DATA" driver=".TX > .Y" receiver=".RX > .A" quiet="low" />
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
  expect(quiet).toContain("NEXT peak 0.01200 V, FEXT peak 0.02500 V")
  expect(quiet).not.toContain("eye height")
  const input = JSON.parse(
    await readFile(join(tmpDir, "pipeline-input.json"), "utf8"),
  )
  expect(
    input.filter(
      (record: any) => record.type === "simulation_signal_integrity",
    ),
  ).toHaveLength(2)
}, 60_000)

test("simulate reports missing blocks and keeps ordinary SPICE simulation", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({ preload })
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
    "tsci simulate analog.tsx --disable-parts-engine",
  )
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain(
    "No <signalintegrity> blocks found in analog.tsx",
  )
  expect(result.stdout).toContain("Index  time")
  expect(await Bun.file(join(tmpDir, "pipeline-input.json")).exists()).toBe(
    false,
  )
}, 30_000)

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
