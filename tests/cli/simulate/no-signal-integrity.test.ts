import { expect, test } from "bun:test"
import { mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runSignalIntegritySimulation } from "../../../cli/simulate/run-signal-integrity-simulation"

test("no SI results return without creating an output directory or running a solver", async () => {
  const projectDir = await mkdtemp(join(tmpdir(), "tsci-empty-si-"))
  try {
    expect(
      await runSignalIntegritySimulation({
        file: join(projectDir, "empty.json"),
        projectDir,
        circuitJson: [],
        output: join(projectDir, "unused"),
      }),
    ).toEqual([])
    expect(await readdir(projectDir)).toEqual([])
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
})
