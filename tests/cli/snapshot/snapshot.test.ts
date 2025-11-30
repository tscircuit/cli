import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import "bun-match-svg"

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

test("snapshot command handles pcb snapshots for imported kicad_mod footprints", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const kicadModPath = join(tmpDir, "imported-footprint.kicad_mod")
  const sourceMod = await Bun.file(
    join(process.cwd(), "examples", "kicad-import", "footprint.kicad_mod"),
  ).text()
  await Bun.write(kicadModPath, sourceMod)

  await Bun.write(
    join(tmpDir, "kicad-board.tsx"),
    `
      import footprint from "./imported-footprint.kicad_mod"

      export const KicadBoard = () => (
        <board width="20mm" height="20mm">
          <chip name="U1" footprint={footprint} />
        </board>
      )
    `,
  )

  const { stdout } = await runCommand(
    "tsci snapshot kicad-board.tsx --update --pcb-only",
  )

  expect(stdout).toContain("Created snapshots")
  expect(stdout).toContain(
    `✅ ${join("__snapshots__", "kicad-board-pcb.snap.svg")}`,
  )

  const snapshotDir = join(tmpDir, "__snapshots__")
  const pcbSnapshot = join(snapshotDir, "kicad-board-pcb.snap.svg")
  const pcbContent = await Bun.file(pcbSnapshot).text()

  expect(pcbContent).toContain("pcb_smtpad")
  expect(pcbContent).toMatchSvgSnapshot(import.meta.path, "kicad-imported-pcb")
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
})

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
})

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
})

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
})

test("snapshot command skips updates when snapshots match visually", async () => {
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

  const { stdout: matchStdout } = await runCommand("tsci snapshot")
  expect(matchStdout).toContain("All snapshots match")

  await runCommand("tsci snapshot --update")
  const contentsAfter = fs.readFileSync(pcbPath, "utf-8")

  expect(contentsAfter).toBe(contentsBefore)
}, 30_000)

test("visual comparison works for pcb and schematic snapshots", async () => {
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

  const { stdout } = await runCommand("tsci snapshot")
  expect(stdout).toContain("All snapshots match")

  await runCommand("tsci snapshot --update")

  const pcbAfter = fs.readFileSync(pcbPath, "utf-8")
  const schAfter = fs.readFileSync(schPath, "utf-8")

  expect(pcbAfter).toBe(pcbBefore)
  expect(schAfter).toBe(schBefore)
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

  const { stderr } = await runCommand("tsci snapshot")
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
