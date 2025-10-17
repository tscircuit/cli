import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import fs from "node:fs"
import "bun-match-svg"

test("snapshot command respects snapshotsDir config", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create config with custom snapshotsDir
  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ snapshotsDir: "tests/__snapshots__" }),
  )

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

  const { stdout } = await runCommand("tsci snapshot --update")
  expect(stdout).toContain("Created snapshots")
  expect(stdout).toContain(
    `✅ ${join("tests", "__snapshots__", "test.board-pcb.snap.svg")}`,
  )
  expect(stdout).toContain(
    `✅ ${join("tests", "__snapshots__", "test.board-schematic.snap.svg")}`,
  )

  const customSnapDir = join(tmpDir, "tests", "__snapshots__")
  const pcbExists = await Bun.file(
    join(customSnapDir, "test.board-pcb.snap.svg"),
  ).exists()
  const schExists = await Bun.file(
    join(customSnapDir, "test.board-schematic.snap.svg"),
  ).exists()

  expect(pcbExists).toBe(true)
  expect(schExists).toBe(true)

  // Verify default __snapshots__ directory was NOT created
  const defaultSnapExists = await Bun.file(
    join(tmpDir, "__snapshots__", "test.board-pcb.snap.svg"),
  ).exists()
  expect(defaultSnapExists).toBe(false)
}, 30_000)

test("snapshot command with custom snapshotsDir in subdirectory", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create config with custom snapshotsDir
  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ snapshotsDir: "snapshots" }),
  )

  const subdir = join(tmpDir, "circuits")
  fs.mkdirSync(subdir, { recursive: true })

  await Bun.write(
    join(subdir, "nested.circuit.tsx"),
    `
    export const Nested = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout } = await runCommand("tsci snapshot --update")
  expect(stdout).toContain("Created snapshots")

  // Snapshots should be in circuits/snapshots/ not circuits/__snapshots__/
  const customSnapDir = join(subdir, "snapshots")
  const pcbExists = await Bun.file(
    join(customSnapDir, "nested.circuit-pcb.snap.svg"),
  ).exists()
  const schExists = await Bun.file(
    join(customSnapDir, "nested.circuit-schematic.snap.svg"),
  ).exists()

  expect(pcbExists).toBe(true)
  expect(schExists).toBe(true)

  // Verify default __snapshots__ directory was NOT created
  const defaultSnapExists = await Bun.file(
    join(subdir, "__snapshots__"),
  ).exists()
  expect(defaultSnapExists).toBe(false)
}, 30_000)

test("snapshot command defaults to __snapshots__ when snapshotsDir not configured", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // No config file - should use default __snapshots__
  await Bun.write(
    join(tmpDir, "default.board.tsx"),
    `
    export const Default = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  const { stdout } = await runCommand("tsci snapshot --update")
  expect(stdout).toContain("Created snapshots")
  expect(stdout).toContain(
    `✅ ${join("__snapshots__", "default.board-pcb.snap.svg")}`,
  )

  const defaultSnapDir = join(tmpDir, "__snapshots__")
  const pcbExists = await Bun.file(
    join(defaultSnapDir, "default.board-pcb.snap.svg"),
  ).exists()

  expect(pcbExists).toBe(true)
}, 30_000)
