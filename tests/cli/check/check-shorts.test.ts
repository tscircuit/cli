import { expect, mock, test } from "bun:test"
import { mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { appendCopperBridgeTrace } from "@tscircuit/check-shorts"
import { temporaryDirectory } from "tempy"
import { getCircuitJsonForCheck } from "../../../cli/check/shared"
import {
  CHECK_SHORTS_CDN_URL,
  checkShorts,
  loadCheckShorts,
} from "../../../cli/check/shorts/register"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={2} pcbY={0} />
  </board>
)
`

const routedCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={-2} pcbY={0} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" pcbX={2} pcbY={0} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
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

const snapshotDir = path.join(
  process.cwd(),
  "tests",
  "cli",
  "check",
  "__snapshots__",
)
const bitmapSnapshotPath = path.join(
  snapshotDir,
  "check-shorts-bitmap.snap.png",
)
const pcbSnapshotSnapshotPath = path.join(
  snapshotDir,
  "check-shorts-pcb.snap.svg",
)

test("check shorts loads the latest checker from jscdn", async () => {
  let requestedUrl: string | undefined
  const expectedModule = {
    renderBitmapShortDebug: () => ({ shorts: [] }),
  } as unknown as typeof import("@tscircuit/check-shorts")

  const loadedModule = await loadCheckShorts({
    preferCdn: true,
    importFromCdn: async (url) => {
      requestedUrl = url
      return expectedModule
    },
  })

  expect(requestedUrl).toBe(CHECK_SHORTS_CDN_URL)
  expect(requestedUrl).toContain("/latest/+esm")
  expect(loadedModule).toBe(expectedModule)
})

test("check shorts falls back to the packaged checker when jscdn is unavailable", async () => {
  const loadedModule = await loadCheckShorts({
    preferCdn: true,
    importFromCdn: async () => {
      throw new Error("jscdn unavailable")
    },
  })

  expect(loadedModule.renderBitmapShortDebug).toBeFunction()
})

test("check shorts reports no shorts for a clean board", async () => {
  const tmpDir = temporaryDirectory()
  const circuitPath = path.join(tmpDir, "clean-board.tsx")

  try {
    await linkWorkspaceNodeModules(tmpDir)
    await writeFile(circuitPath, routedCircuitCode)

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
  const bitmapArtifactPath = path.join(
    tmpDir,
    "checks",
    "check-shorts",
    "bitmap.png",
  )
  const pcbSnapshotPath = path.join(tmpDir, "checks", "check-shorts", "pcb.svg")

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
    const expectedBitmapSnapshot = await readFile(bitmapSnapshotPath)
    const expectedPcbSnapshot = await readFile(pcbSnapshotSnapshotPath, "utf-8")

    expect(exitCode).toBe(1)
    expect(stderr).toBe("")
    expect(stdout).toContain("Detected")
    expect(stdout).toContain("Resolving check input")
    expect(stdout).toContain("Reading prebuilt circuit JSON")
    expect(stdout).toContain("Prebuilt circuit JSON ready")
    expect(stdout).toContain("Loading short-check engine")
    expect(stdout).toContain("Checking top and bottom gerber copper")
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
    expect(artifactPng).toEqual(expectedBitmapSnapshot)
    expect(pcbSnapshot).toEqual(expectedPcbSnapshot)
  } finally {
    await rm(circuitPath, { force: true })
    await rm(circuitJsonPath, { force: true })
    await rm(bitmapArtifactPath, { force: true })
    await rm(pcbSnapshotPath, { force: true })
  }
}, 20_000)

test("check shorts routes a source board before analyzing it", async () => {
  const tmpDir = temporaryDirectory()
  const circuitPath = path.join(tmpDir, "routed-board.tsx")
  let pcbTraceCount = 0
  const progressMessages: string[] = []

  try {
    await linkWorkspaceNodeModules(tmpDir)
    await writeFile(circuitPath, routedCircuitCode)
    mock.module("@tscircuit/check-shorts", () => ({
      renderBitmapShortDebug: (
        circuitJson: Array<{ type: string }>,
        options: {
          mode: "pcb" | "gerber"
          layer: "top" | "bottom"
          onProgress?: (event: Record<string, unknown>) => void
        },
      ) => {
        pcbTraceCount = circuitJson.filter(
          (element) => element.type === "pcb_trace",
        ).length
        const baseEvent = { mode: options.mode, layer: options.layer }
        options.onProgress?.({ phase: "preparing", ...baseEvent })
        options.onProgress?.({
          phase: "rasterizing",
          ...baseEvent,
          width: 100,
          height: 100,
          completedGroups: 0,
          totalGroups: 2,
        })
        options.onProgress?.({
          phase: "rasterizing",
          ...baseEvent,
          width: 100,
          height: 100,
          completedGroups: 2,
          totalGroups: 2,
        })
        options.onProgress?.({ phase: "detecting", ...baseEvent })
        options.onProgress?.({
          phase: "complete",
          ...baseEvent,
          shortsFound: 0,
        })
        return { shorts: [] }
      },
    }))

    const result = await checkShorts(circuitPath, {
      onProgress: (message) => progressMessages.push(message),
    })

    expect(result.shorts).toHaveLength(0)
    expect(pcbTraceCount).toBeGreaterThan(0)
    expect(progressMessages).toContain("Resolving check input...")
    expect(progressMessages.join("\n")).toContain("Preparing circuit JSON")
    expect(progressMessages).toContain("Circuit JSON rendered from source.")
    expect(progressMessages).toContain("Loading short-check engine...")
    expect(progressMessages).toContain(
      "Rasterizing top/gerber copper groups: 0/2 (0%)...",
    )
    expect(progressMessages).toContain(
      "Rasterizing top/gerber copper groups: 2/2 (100%)...",
    )
    expect(progressMessages).toContain("Finished top/gerber: 0 shorts found.")
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}, 20_000)
