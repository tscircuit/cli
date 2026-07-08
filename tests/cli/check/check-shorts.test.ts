import { expect, test } from "bun:test"
import { appendCopperBridgeTrace } from "@tscircuit/check-shorts"
import { mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import { checkShorts } from "../../../cli/check/shorts/register"
import { getCircuitJsonForCheck } from "../../../cli/check/shared"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={2} pcbY={0} />
  </board>
)
`

const makeCircuitJsonWithShort = async (circuitPath: string) => {
  const circuitJson = await getCircuitJsonForCheck({
    filePath: circuitPath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: true,
    },
  })

  return appendCopperBridgeTrace(circuitJson, {
    start: { x: -2.2, y: 0 },
    end: { x: 2.2, y: 0 },
    width: 0.25,
  })
}

const linkWorkspaceNodeModules = async (tmpDir: string) => {
  await symlink(
    path.join(process.cwd(), "node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
}

test("check shorts reports no shorts for a clean board", async () => {
  const tmpDir = temporaryDirectory()
  const circuitPath = path.join(tmpDir, "clean-board.tsx")

  try {
    await linkWorkspaceNodeModules(tmpDir)
    await writeFile(circuitPath, circuitCode)

    const result = await checkShorts(circuitPath)

    expect(result.shorts).toHaveLength(0)
    expect(result.artifacts).toBeUndefined()
    expect(result.output).toContain("No shorts detected")
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}, 20_000)

test("tsci check shorts detects a copper bridge short", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "shorted-board.tsx")
  const circuitJsonPath = path.join(tmpDir, "shorted-board.circuit.json")
  const bitmapArtifactPath = path.join(tmpDir, "checks", "check-shorts.png")
  const pcbSnapshotPath = path.join(tmpDir, "checks", "check-shorts-pcb.svg")

  try {
    await linkWorkspaceNodeModules(tmpDir)
    await writeFile(circuitPath, circuitCode)
    const circuitJson = await makeCircuitJsonWithShort(circuitPath)
    await writeFile(circuitJsonPath, JSON.stringify(circuitJson, null, 2))
    await mkdir(path.dirname(bitmapArtifactPath), { recursive: true })
    await writeFile(bitmapArtifactPath, "stale bitmap artifact")
    await writeFile(pcbSnapshotPath, "stale pcb snapshot")

    const { stdout, stderr, exitCode } = await runCommand(
      `tsci check shorts ${circuitJsonPath}`,
    )
    const artifactPng = await readFile(bitmapArtifactPath)
    const artifactStats = await stat(bitmapArtifactPath)
    const pcbSnapshot = await readFile(pcbSnapshotPath, "utf-8")
    const pcbSnapshotStats = await stat(pcbSnapshotPath)

    expect(exitCode).toBe(1)
    expect(stderr).toBe("")
    expect(stdout).toContain("Detected")
    expect(stdout).toContain("short")
    expect(stdout).toContain("top/gerber")
    expect(stdout).toContain("R1.pin")
    expect(stdout).toContain("C1.pin")
    expect(stdout).toContain("pcb_trace_short_bridge")
    expect(stdout).toContain(
      `Short debug artifact written to ${bitmapArtifactPath}`,
    )
    expect(stdout).toContain(
      `Short debug artifact written to ${pcbSnapshotPath}`,
    )
    expect(artifactStats.size).toBeGreaterThan("stale bitmap artifact".length)
    expect([...artifactPng.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ])
    expect(pcbSnapshotStats.size).toBeGreaterThan("stale pcb snapshot".length)
    expect(pcbSnapshot).toContain("<svg")
    expect(pcbSnapshot).toContain('data-type="short-debug"')
  } finally {
    await rm(circuitPath, { force: true })
    await rm(circuitJsonPath, { force: true })
    await rm(bitmapArtifactPath, { force: true })
    await rm(pcbSnapshotPath, { force: true })
  }
}, 20_000)
