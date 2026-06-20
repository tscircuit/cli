import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import "bun-match-svg"

const boostSimulationCircuitCode = `
export const BoostConverter = () => (
  <board width={30} height={30}>
    <voltagesource
      name="V1"
      voltage="5V"
      schY={2}
      schX={-5}
      schRotation={270}
    />
    <trace from=".V1 > .pin1" to=".L1 > .pin1" />
    <trace from=".L1 > .pin2" to=".D1 > .anode" />
    <trace from=".D1 > .cathode" to=".C1 > .pin1" />
    <trace from=".D1 > .cathode" to=".R1 > .pin1" />
    <trace from=".C1 > .pin2" to=".R1 > .pin2" />
    <trace from=".R1 > .pin2" to=".V1 > .pin2" />
    <trace from=".L1 > .pin2" to=".M1 > .drain" />
    <trace from=".M1 > .source" to=".V1 > .pin2" />
    <trace from=".M1 > .source" to="net.GND" />
    <trace from=".M1 > .gate" to=".V2 > .pin1" />
    <trace from=".V2 > .pin2" to=".V1 > .pin2" />
    <inductor name="L1" inductance="1H" footprint="0603" schY={3} pcbY={6} pcbX={-3} />
    <diode name="D1" footprint="0603" schY={3} schX={3} pcbY={6} pcbX={3} />
    <capacitor
      polarized
      schRotation={270}
      name="C1"
      capacitance="10uF"
      footprint="0603"
      schX={3}
      pcbX={3}
    />
    <resistor
      schRotation={270}
      name="R1"
      resistance="1k"
      footprint="0603"
      schX={6}
      pcbX={9}
    />
    <voltagesource
      name="V2"
      schRotation={270}
      voltage="10V"
      waveShape="square"
      dutyCycle={0.68}
      frequency="1kHz"
      schX={-3}
    />
    <mosfet
      channelType="n"
      footprint="sot23"
      name="M1"
      mosfetMode="enhancement"
      pcbX={-4}
    />
    <voltageprobe
      name="VOUT_PROBE"
      connectsTo=".D1 > .cathode"
      referenceTo="net.GND"
      color="#315cff"
      display={{ label: "VOUT" }}
    />
    <analogsimulation
      duration="2ms"
      timePerStep="10us"
      spiceEngine="ngspice"
    />
  </board>
)`

test("snapshot command creates SVG snapshots", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "test.board.tsx"),
    `
    export const TestBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout: updateStdout } = await runCommand(
    "tsci snapshot --update --3d",
  )
  expect(updateStdout).toContain("Created snapshots")
  expect(updateStdout).toContain(
    `✅ ${join("__snapshots__", "test.board-pcb.snap.svg")}`,
  )
  expect(updateStdout).toContain(
    `✅ ${join("__snapshots__", "test.board-schematic.snap.svg")}`,
  )
  expect(updateStdout).toContain(
    `✅ ${join("__snapshots__", "test.board-3d.snap.png")}`,
  )

  const snapshotDir = join(tmpDir, "__snapshots__")
  const pcbSnapshot = await Bun.file(
    join(snapshotDir, "test.board-pcb.snap.svg"),
  ).exists()
  const schSnapshot = await Bun.file(
    join(snapshotDir, "test.board-schematic.snap.svg"),
  ).exists()
  const threeDSnapshot = await Bun.file(
    join(snapshotDir, "test.board-3d.snap.png"),
  ).exists()

  expect(pcbSnapshot).toBe(true)
  expect(schSnapshot).toBe(true)
  expect(threeDSnapshot).toBe(true)
  expect(
    await Bun.file(
      join(snapshotDir, "test.board-simulation.snap.svg"),
    ).exists(),
  ).toBe(false)
  expect(
    await Bun.file(
      join(snapshotDir, "test.board-schematic-simulation.snap.svg"),
    ).exists(),
  ).toBe(false)

  const pcbContent = await Bun.file(
    join(snapshotDir, "test.board-pcb.snap.svg"),
  ).text()
  const schContent = await Bun.file(
    join(snapshotDir, "test.board-schematic.snap.svg"),
  ).text()
  const threeDContent = await Bun.file(
    join(snapshotDir, "test.board-3d.snap.png"),
  ).arrayBuffer()

  expect(pcbContent).toMatchSvgSnapshot(import.meta.path, "pcb")
  expect(schContent).toMatchSvgSnapshot(import.meta.path, "schematic")

  const { stdout: testStdout } = await runCommand("tsci snapshot --3d")
  expect(testStdout).toContain("All snapshots match")
}, 30_000)

test("snapshot command creates simulation SVG snapshots when analog simulation exists", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "boost.circuit.tsx"), boostSimulationCircuitCode)

  const { stdout: updateStdout } = await runCommand("tsci snapshot --update")
  expect(updateStdout).toContain("Created snapshots")
  expect(updateStdout).toContain(
    `✅ ${join("__snapshots__", "boost.circuit-simulation.snap.svg")}`,
  )
  expect(updateStdout).toContain(
    `✅ ${join("__snapshots__", "boost.circuit-schematic-simulation.snap.svg")}`,
  )

  const snapshotDir = join(tmpDir, "__snapshots__")
  const simulationSnapshot = await Bun.file(
    join(snapshotDir, "boost.circuit-simulation.snap.svg"),
  ).text()
  const schematicSimulationSnapshot = await Bun.file(
    join(snapshotDir, "boost.circuit-schematic-simulation.snap.svg"),
  ).text()

  expect(simulationSnapshot).toContain("<svg")
  expect(schematicSimulationSnapshot).toContain("<svg")

  const { stdout: testStdout } = await runCommand("tsci snapshot")
  expect(testStdout).toContain("All snapshots match")
}, 60_000)

test("snapshot command --simulation-only creates only simulation SVG snapshots", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(join(tmpDir, "boost.circuit.tsx"), boostSimulationCircuitCode)

  const { stdout: updateStdout } = await runCommand(
    "tsci snapshot --update --simulation-only",
  )
  expect(updateStdout).toContain("Created snapshots")
  expect(updateStdout).toContain(
    `✅ ${join("__snapshots__", "boost.circuit-simulation.snap.svg")}`,
  )
  expect(updateStdout).toContain(
    `✅ ${join("__snapshots__", "boost.circuit-schematic-simulation.snap.svg")}`,
  )

  const snapshotDir = join(tmpDir, "__snapshots__")
  expect(
    fs.existsSync(join(snapshotDir, "boost.circuit-simulation.snap.svg")),
  ).toBe(true)
  expect(
    fs.existsSync(
      join(snapshotDir, "boost.circuit-schematic-simulation.snap.svg"),
    ),
  ).toBe(true)
  expect(fs.existsSync(join(snapshotDir, "boost.circuit-pcb.snap.svg"))).toBe(
    false,
  )
  expect(
    fs.existsSync(join(snapshotDir, "boost.circuit-schematic.snap.svg")),
  ).toBe(false)
  expect(fs.existsSync(join(snapshotDir, "boost.circuit-3d.snap.png"))).toBe(
    false,
  )

  const { stdout: testStdout } = await runCommand(
    "tsci snapshot --simulation-only",
  )
  expect(testStdout).toContain("All snapshots match")
}, 60_000)

test("snapshot command --simulation-only rejects other snapshot type filters", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stderr, exitCode } = await runCommand(
    "tsci snapshot --simulation-only --pcb-only",
  )

  expect(exitCode).toBe(1)
  expect(stderr).toContain(
    "--simulation-only cannot be combined with --pcb-only, --schematic-only, --layer, --3d, or --camera-preset.",
  )
})

test("snapshot command snapshots circuit files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "index.circuit.tsx"),
    `
    export const IndexBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await Bun.write(
    join(tmpDir, "extra.circuit.tsx"),
    `
    export const ExtraBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout } = await runCommand("tsci snapshot --update")
  expect(stdout).toContain("Created snapshots")
  expect(stdout).toContain(
    `✅ ${join("__snapshots__", "index.circuit-pcb.snap.svg")}`,
  )
  expect(stdout).toContain(
    `✅ ${join("__snapshots__", "index.circuit-schematic.snap.svg")}`,
  )
  expect(stdout).toContain(
    `✅ ${join("__snapshots__", "extra.circuit-pcb.snap.svg")}`,
  )
  expect(stdout).toContain(
    `✅ ${join("__snapshots__", "extra.circuit-schematic.snap.svg")}`,
  )

  const snapDir = join(tmpDir, "__snapshots__")

  const indexPcb = await Bun.file(
    join(snapDir, "index.circuit-pcb.snap.svg"),
  ).exists()
  const indexSch = await Bun.file(
    join(snapDir, "index.circuit-schematic.snap.svg"),
  ).exists()
  const extraPcb = await Bun.file(
    join(snapDir, "extra.circuit-pcb.snap.svg"),
  ).exists()
  const extraSch = await Bun.file(
    join(snapDir, "extra.circuit-schematic.snap.svg"),
  ).exists()

  expect(indexPcb).toBe(true)
  expect(indexSch).toBe(true)
  expect(extraPcb).toBe(true)
  expect(extraSch).toBe(true)
}, 30_000)

test("snapshot command supports direct circuit.json files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "circuit.json"),
    JSON.stringify([
      {
        type: "pcb_board",
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
        thickness: 1.6,
        num_layers: 2,
      },
    ]),
  )

  const { stdout } = await runCommand("tsci snapshot circuit.json --update")
  expect(stdout).toContain("Created snapshots")
  expect(stdout).toContain(
    `✅ ${join("__snapshots__", "circuit-pcb.snap.svg")}`,
  )
  expect(stdout).toContain(
    `✅ ${join("__snapshots__", "circuit-schematic.snap.svg")}`,
  )

  const snapDir = join(tmpDir, "__snapshots__")
  expect(await Bun.file(join(snapDir, "circuit-pcb.snap.svg")).exists()).toBe(
    true,
  )
  expect(
    await Bun.file(join(snapDir, "circuit-schematic.snap.svg")).exists(),
  ).toBe(true)
}, 30_000)

test("snapshot respects includeBoardFiles config", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["boards/**/*.board.tsx"] }),
  )

  fs.mkdirSync(join(tmpDir, "boards"), { recursive: true })

  await Bun.write(
    join(tmpDir, "boards", "chosen.board.tsx"),
    `
    export const Chosen = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await Bun.write(
    join(tmpDir, "other.board.tsx"),
    `
    export const Other = () => (
      <board width="10mm" height="10mm">
        <chip name="U2" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout } = await runCommand("tsci snapshot --update")
  expect(stdout).toContain("Created snapshots")

  const boardsSnapDir = join(tmpDir, "boards", "__snapshots__")
  const chosenPcb = await Bun.file(
    join(boardsSnapDir, "chosen.board-pcb.snap.svg"),
  ).exists()
  const chosenSch = await Bun.file(
    join(boardsSnapDir, "chosen.board-schematic.snap.svg"),
  ).exists()

  expect(chosenPcb).toBe(true)
  expect(chosenSch).toBe(true)

  const rootSnapExists = await Bun.file(
    join(tmpDir, "__snapshots__", "other.board-pcb.snap.svg"),
  ).exists()
  expect(rootSnapExists).toBe(false)
}, 30_000)

test("snapshot command --pcb-only", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "only.board.tsx"),
    `
    export const OnlyBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update --pcb-only")

  const snapDir = join(tmpDir, "__snapshots__")
  const pcbExists = await Bun.file(
    join(snapDir, "only.board-pcb.snap.svg"),
  ).exists()
  const schExists = await Bun.file(
    join(snapDir, "only.board-schematic.snap.svg"),
  ).exists()

  expect(pcbExists).toBe(true)
  expect(schExists).toBe(false)
}, 30_000)

test("snapshot command --schematic-only", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "schem.board.tsx"),
    `
    export const SchemBoard = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update --schematic-only")

  const snapDir = join(tmpDir, "__snapshots__")
  const pcbExists = await Bun.file(
    join(snapDir, "schem.board-pcb.snap.svg"),
  ).exists()
  const schExists = await Bun.file(
    join(snapDir, "schem.board-schematic.snap.svg"),
  ).exists()

  expect(pcbExists).toBe(false)
  expect(schExists).toBe(true)
}, 30_000)

test("snapshot command with file path", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const subdir = join(tmpDir, "sub")
  fs.mkdirSync(subdir)

  await Bun.write(
    join(subdir, "single.circuit.tsx"),
    `
    export const Single = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout } = await runCommand(
    "tsci snapshot sub/single.circuit.tsx --update",
  )
  expect(stdout).toContain("Created snapshots")

  const snapDir = join(subdir, "__snapshots__")
  const pcbExists = await Bun.file(
    join(snapDir, "single.circuit-pcb.snap.svg"),
  ).exists()
  const schExists = await Bun.file(
    join(snapDir, "single.circuit-schematic.snap.svg"),
  ).exists()

  expect(pcbExists).toBe(true)
  expect(schExists).toBe(true)

  const rootSnapExists = await Bun.file(join(tmpDir, "__snapshots__")).exists()
  expect(rootSnapExists).toBe(false)
}, 30_000)

test("snapshot command with directory path", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const subdir = join(tmpDir, "dir")
  fs.mkdirSync(subdir)

  await Bun.write(
    join(subdir, "one.board.tsx"),
    `
    export const One = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await Bun.write(
    join(subdir, "two.circuit.tsx"),
    `
    export const Two = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout } = await runCommand("tsci snapshot dir --update")
  expect(stdout).toContain("Created snapshots")

  const snapDir = join(subdir, "__snapshots__")
  const onePcb = await Bun.file(
    join(snapDir, "one.board-pcb.snap.svg"),
  ).exists()
  const twoPcb = await Bun.file(
    join(snapDir, "two.circuit-pcb.snap.svg"),
  ).exists()

  expect(onePcb).toBe(true)
  expect(twoPcb).toBe(true)

  const rootExists = await Bun.file(join(tmpDir, "__snapshots__")).exists()
  expect(rootExists).toBe(false)
}, 30_000)

test("snapshot with directory path errors when no files match configured includeBoardFiles", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const srcDir = join(tmpDir, "src")
  fs.mkdirSync(srcDir)

  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["src/**/*.board.tsx"] }),
  )
  await Bun.write(
    join(srcDir, "index.tsx"),
    `
    export const Component = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stderr, stdout, exitCode } = await runCommand("tsci snapshot src")

  expect(exitCode).toBe(1)
  expect(stderr).toContain(
    'No circuit files found to create snapshots in directory: "src"',
  )
  expect(stderr).toContain(
    'Searched using tscircuit.config.json includeBoardFiles: ["src/**/*.board.tsx"]',
  )
  expect(stderr).not.toContain("No entrypoint found")
  expect(stdout).not.toContain("No entrypoint found")
}, 30_000)

test("snapshot with directory path and default includeBoardFiles returns clear no-match error", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const targetDir = join(tmpDir, "lib", "example_connectors", "example_header")
  fs.mkdirSync(targetDir, { recursive: true })

  await Bun.write(
    join(targetDir, "index.tsx"),
    `
    export const Component = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stderr, stdout, exitCode } = await runCommand(
    "tsci snapshot lib/example_connectors/example_header --concurrency 4",
  )

  expect(exitCode).toBe(1)
  expect(stderr).toContain(
    'No circuit files found to create snapshots in directory: "lib/example_connectors/example_header"',
  )
  expect(stderr).toContain(
    'Searched using default includeBoardFiles: ["**/*.board.tsx","**/*.circuit.tsx","**/*.circuit.json"]',
  )
  expect(stderr).not.toContain("No entrypoint found")
  expect(stdout).not.toContain("No entrypoint found")
}, 30_000)

test("snapshot command treats textual snapshot changes as mismatch by default", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "visual.board.tsx"),
    `
    export const Visual = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update")

  const snapDir = join(tmpDir, "__snapshots__")
  const pcbPath = join(snapDir, "visual.board-pcb.snap.svg")

  fs.appendFileSync(pcbPath, "\n<!-- comment -->\n")
  const contentsBefore = fs.readFileSync(pcbPath, "utf-8")

  const { stderr: matchStderr, exitCode: matchExitCode } =
    await runCommand("tsci snapshot")
  expect(matchExitCode).toBe(1)
  expect(matchStderr).toContain("Snapshot mismatch")

  await runCommand("tsci snapshot --update")
  const contentsAfter = fs.readFileSync(pcbPath, "utf-8")

  expect(contentsAfter).not.toBe(contentsBefore)
  expect(contentsAfter).not.toContain("<!-- comment -->")
}, 30_000)

test("snapshot command treats textual pcb and schematic changes as mismatch by default", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "both.board.tsx"),
    `
    export const Both = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update")

  const snapDir = join(tmpDir, "__snapshots__")
  const pcbPath = join(snapDir, "both.board-pcb.snap.svg")
  const schPath = join(snapDir, "both.board-schematic.snap.svg")

  fs.appendFileSync(pcbPath, "\n<!-- comment -->\n")
  fs.appendFileSync(schPath, "\n<!-- comment -->\n")

  const pcbBefore = fs.readFileSync(pcbPath, "utf-8")
  const schBefore = fs.readFileSync(schPath, "utf-8")

  const { stderr, exitCode } = await runCommand("tsci snapshot")
  expect(exitCode).toBe(1)
  expect(stderr).toContain("Snapshot mismatch")

  await runCommand("tsci snapshot --update")

  const pcbAfter = fs.readFileSync(pcbPath, "utf-8")
  const schAfter = fs.readFileSync(schPath, "utf-8")

  expect(pcbAfter).not.toBe(pcbBefore)
  expect(schAfter).not.toBe(schBefore)
  expect(pcbAfter).not.toContain("<!-- comment -->")
  expect(schAfter).not.toContain("<!-- comment -->")
}, 30_000)

test("snapshot command does not create diff files by default when visuals change", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "mismatch-no-diff.board.tsx"),
    `
    export const MismatchNoDiff = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update")

  await Bun.write(
    join(tmpDir, "mismatch-no-diff.board.tsx"),
    `
    export const MismatchNoDiff = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
        <chip name="U2" footprint="soic8" schX={-3} pcbX={-3} />
      </board>
    )
  `,
  )

  const { stderr } = await runCommand("tsci snapshot")
  expect(stderr).toContain("Snapshot mismatch")
  expect(stderr).not.toContain(".diff")

  const snapDir = join(tmpDir, "__snapshots__")
  const pcbDiff = await Bun.file(
    join(snapDir, "mismatch-no-diff.board-pcb.diff.svg"),
  ).exists()
  const schDiff = await Bun.file(
    join(snapDir, "mismatch-no-diff.board-schematic.diff.svg"),
  ).exists()

  expect(pcbDiff).toBe(false)
  expect(schDiff).toBe(false)
}, 30_000)
test("snapshot command creates diff files when visuals change", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "mismatch.board.tsx"),
    `
    export const Mismatch = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot --update")

  await Bun.write(
    join(tmpDir, "mismatch.board.tsx"),
    `
    export const Mismatch = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
        <chip name="U2" footprint="soic8" schX={-3} pcbX={-3} />
      </board>
    )
  `,
  )

  const { stderr } = await runCommand("tsci snapshot --test")
  expect(stderr).toContain("Snapshot mismatch")

  const snapDir = join(tmpDir, "__snapshots__")
  const pcbDiff = await Bun.file(
    join(snapDir, "mismatch.board-pcb.diff.svg"),
  ).exists()
  const schDiff = await Bun.file(
    join(snapDir, "mismatch.board-schematic.diff.svg"),
  ).exists()

  expect(pcbDiff).toBe(true)
  expect(schDiff).toBe(true)
}, 30_000)

test("snapshot command with glob pattern", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const subdir = join(tmpDir, "examples")
  fs.mkdirSync(subdir)

  await Bun.write(
    join(subdir, "first.circuit.tsx"),
    `
    export const First = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await Bun.write(
    join(subdir, "second.circuit.tsx"),
    `
    export const Second = () => (
      <board width="10mm" height="10mm">
        <chip name="U2" footprint="soic8" />
      </board>
    )
  `,
  )

  await Bun.write(
    join(tmpDir, "other.board.tsx"),
    `
    export const Other = () => (
      <board width="10mm" height="10mm">
        <chip name="U3" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot examples/**/*.tsx")

  const snapDir = join(subdir, "__snapshots__")
  const firstPcb = await Bun.file(
    join(snapDir, "first.circuit-pcb.snap.svg"),
  ).exists()
  const secondPcb = await Bun.file(
    join(snapDir, "second.circuit-pcb.snap.svg"),
  ).exists()

  expect(firstPcb).toBe(true)
  expect(secondPcb).toBe(true)

  // Verify that other.board.tsx was not snapshotted
  const rootSnapDir = join(tmpDir, "__snapshots__")
  const otherPcb = await Bun.file(
    join(rootSnapDir, "other.board-pcb.snap.svg"),
  ).exists()
  expect(otherPcb).toBe(false)
}, 30_000)

test("snapshot command with wildcard glob pattern", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "match.circuit.tsx"),
    `
    export const Match = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  await Bun.write(
    join(tmpDir, "also.circuit.tsx"),
    `
    export const Also = () => (
      <board width="10mm" height="10mm">
        <chip name="U2" footprint="soic8" />
      </board>
    )
  `,
  )

  await Bun.write(
    join(tmpDir, "skip.board.tsx"),
    `
    export const Skip = () => (
      <board width="10mm" height="10mm">
        <chip name="U3" footprint="soic8" />
      </board>
    )
  `,
  )

  await runCommand("tsci snapshot *.circuit.tsx")

  const snapDir = join(tmpDir, "__snapshots__")
  const matchPcb = await Bun.file(
    join(snapDir, "match.circuit-pcb.snap.svg"),
  ).exists()
  const alsoPcb = await Bun.file(
    join(snapDir, "also.circuit-pcb.snap.svg"),
  ).exists()
  const skipPcb = await Bun.file(
    join(snapDir, "skip.board-pcb.snap.svg"),
  ).exists()

  expect(matchPcb).toBe(true)
  expect(alsoPcb).toBe(true)
  expect(skipPcb).toBe(false)
}, 30_000)

test("snapshot command creates 3d snapshot for larger board", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await Bun.write(
    join(tmpDir, "large-pcb.board.tsx"),
    `
    export const LargePcb = () => (
      <board width="40.64mm" height="24.13mm">
        <chip
          name="U1"
          footprint="soic8"
        />
      </board>
    )
  `,
  )

  const { stdout } = await runCommand("tsci snapshot --update --3d")
  expect(stdout).toContain("Created snapshots")
  expect(stdout).toContain(
    `${join("__snapshots__", "large-pcb.board-3d.snap.png")}`,
  )

  const snapshotDir = join(tmpDir, "__snapshots__")
  const threeDExists = await Bun.file(
    join(snapshotDir, "large-pcb.board-3d.snap.png"),
  ).exists()
  expect(threeDExists).toBe(true)

  // Save snapshot to repo __snapshots__ directory
  const repoSnapshotPath = join(
    import.meta.dir,
    "__snapshots__",
    "large-pcb-3d.snap.png",
  )
  await Bun.write(
    repoSnapshotPath,
    Bun.file(join(snapshotDir, "large-pcb.board-3d.snap.png")),
  )
}, 60_000)
