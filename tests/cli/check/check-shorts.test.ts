import "bun-match-svg"
import { expect, mock, test } from "bun:test"
import { mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  appendCopperBridgeTrace,
  createShortDebugSvg,
} from "@tscircuit/check-shorts"
import { pcb_board, type PcbTrace } from "circuit-json"
import { decode } from "fast-png"
import { temporaryDirectory } from "tempy"
import { getCircuitJsonForCheck } from "../../../cli/check/shared"
import { getCheckShortLayers } from "../../../cli/check/shorts/get-check-short-layers"
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

const emptyBoardCircuitCode = `
export default () => (
  <board width="10mm" height="10mm" routingDisabled />
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

const makeFourLayerCircuitJsonWithInnerShort = async (circuitPath: string) => {
  const circuitJson = await getCircuitJsonForCheck({
    filePath: circuitPath,
    platformConfig: {
      pcbDisabled: false,
      routingDisabled: true,
    },
  })
  const pcbBoard = circuitJson.find((element) => element.type === "pcb_board")
  if (!pcbBoard || pcbBoard.type !== "pcb_board") {
    throw new Error("Expected the repro to render a PCB board")
  }
  pcbBoard.num_layers = 4

  const makeInnerTrace = ({
    pcbTraceId,
    start,
    end,
  }: {
    pcbTraceId: string
    start: { x: number; y: number }
    end: { x: number; y: number }
  }): PcbTrace => ({
    type: "pcb_trace",
    pcb_trace_id: pcbTraceId,
    route: [
      {
        route_type: "wire",
        ...start,
        width: 0.25,
        layer: "inner1",
      },
      {
        route_type: "wire",
        ...end,
        width: 0.25,
        layer: "inner1",
      },
    ],
  })

  circuitJson.push(
    makeInnerTrace({
      pcbTraceId: "pcb_trace_inner_horizontal",
      start: { x: -3, y: 0 },
      end: { x: 3, y: 0 },
    }),
    makeInnerTrace({
      pcbTraceId: "pcb_trace_inner_vertical",
      start: { x: 0, y: -3 },
      end: { x: 0, y: 3 },
    }),
  )

  return circuitJson
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
const innerLayerBitmapSnapshotPath = path.join(
  snapshotDir,
  "check-shorts-inner-layer-bitmap.snap.png",
)

const expectSameBitmap = (actual: Uint8Array, expected: Uint8Array) => {
  const actualBitmap = decode(actual)
  const expectedBitmap = decode(expected)

  expect(actualBitmap.width).toBe(expectedBitmap.width)
  expect(actualBitmap.height).toBe(expectedBitmap.height)
  expect(actualBitmap.channels).toBe(expectedBitmap.channels)
  expect(actualBitmap.data).toEqual(expectedBitmap.data)
}

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
    expectSameBitmap(artifactPng, expectedBitmapSnapshot)
    expect(pcbSnapshot).toEqual(expectedPcbSnapshot)
  } finally {
    await rm(circuitPath, { force: true })
    await rm(circuitJsonPath, { force: true })
    await rm(bitmapArtifactPath, { force: true })
    await rm(pcbSnapshotPath, { force: true })
  }
}, 20_000)

test("check shorts --layer all detects an inner-layer short", async () => {
  const { tmpDir } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "inner-layer-short.tsx")
  const circuitJsonPath = path.join(tmpDir, "inner-layer-short.circuit.json")

  try {
    await linkWorkspaceNodeModules(tmpDir)
    await writeFile(circuitPath, emptyBoardCircuitCode)
    const circuitJson =
      await makeFourLayerCircuitJsonWithInnerShort(circuitPath)
    await writeFile(circuitJsonPath, JSON.stringify(circuitJson, null, 2))

    const result = await checkShorts(circuitJsonPath, { layer: "all" })
    const debugSvg = createShortDebugSvg(circuitJson, result.shorts, {
      layer: "inner1",
    })

    expect(debugSvg).toMatchSvgSnapshot(
      import.meta.path,
      "check-shorts-inner-layer-pcb",
    )
    expect(result.output).toContain("Detected 1 short")
    expect(result.output).toContain("inner1/gerber")
    expect(result.shorts).toHaveLength(1)

    const bitmapArtifact = result.artifacts?.find(
      (artifact) => artifact.contentType === "image/png",
    )
    if (!bitmapArtifact || typeof bitmapArtifact.content === "string") {
      throw new Error("Expected an inner-layer short bitmap")
    }
    expectSameBitmap(
      bitmapArtifact.content,
      new Uint8Array(await readFile(innerLayerBitmapSnapshotPath)),
    )
  } finally {
    await rm(circuitPath, { force: true })
    await rm(circuitJsonPath, { force: true })
  }
}, 20_000)

test("check shorts exposes only top on a one-layer board", () => {
  const circuitJson = [
    pcb_board.parse({
      type: "pcb_board",
      pcb_board_id: "pcb_board_one_layer",
      center: { x: 0, y: 0 },
      num_layers: 1,
    }),
  ]

  expect(getCheckShortLayers({ circuitJson, layerOption: "all" })).toEqual([
    "top",
  ])
  expect(() =>
    getCheckShortLayers({ circuitJson, layerOption: "bottom" }),
  ).toThrow(
    "--layer bottom is not available on this 1-layer board; available layers: top",
  )
})

test("check shorts can select an individual inner layer", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "individual-inner-layer-short.tsx")
  const circuitJsonPath = path.join(
    tmpDir,
    "individual-inner-layer-short.circuit.json",
  )

  try {
    await linkWorkspaceNodeModules(tmpDir)
    await writeFile(circuitPath, emptyBoardCircuitCode)
    const circuitJson =
      await makeFourLayerCircuitJsonWithInnerShort(circuitPath)
    await writeFile(circuitJsonPath, JSON.stringify(circuitJson, null, 2))

    const selectedInnerLayer = await runCommand(
      `tsci check shorts ${circuitJsonPath} --mode pcb --layer inner1`,
    )

    expect(selectedInnerLayer.exitCode).toBe(1)
    expect(selectedInnerLayer.stderr).toBe("")
    expect(selectedInnerLayer.stdout).toContain("Detected 1 short")
    expect(selectedInnerLayer.stdout).toContain("inner1/pcb")

    const unavailableInnerLayer = await runCommand(
      `tsci check shorts ${circuitJsonPath} --mode pcb --layer inner3`,
    )

    expect(unavailableInnerLayer.exitCode).toBe(1)
    expect(unavailableInnerLayer.stdout).not.toContain("Detected")
    expect(unavailableInnerLayer.stderr).toContain(
      "--layer inner3 is not available on this 4-layer board; available layers: top, inner1, inner2, bottom",
    )

    const invalidLayer = await runCommand(
      `tsci check shorts ${circuitJsonPath} --mode pcb --layer copper1`,
    )

    expect(invalidLayer.exitCode).toBe(1)
    expect(invalidLayer.stdout).not.toContain("Detected")
    expect(invalidLayer.stderr).toContain(
      "--layer must be one of: top, bottom, inner1, inner2, inner3, inner4, inner5, inner6, inner7, inner8, all",
    )
  } finally {
    await rm(circuitPath, { force: true })
    await rm(circuitJsonPath, { force: true })
  }
}, 30_000)

test("check shorts routes a source board before analyzing it", async () => {
  const tmpDir = temporaryDirectory()
  const circuitPath = path.join(tmpDir, "routed-board.tsx")
  let pcbTraceCount = 0

  try {
    await linkWorkspaceNodeModules(tmpDir)
    await writeFile(circuitPath, routedCircuitCode)
    mock.module("@tscircuit/check-shorts", () => ({
      renderBitmapShortDebug: (circuitJson: Array<{ type: string }>) => {
        pcbTraceCount = circuitJson.filter(
          (element) => element.type === "pcb_trace",
        ).length
        return { shorts: [] }
      },
    }))

    const result = await checkShorts(circuitPath)

    expect(result.shorts).toHaveLength(0)
    expect(pcbTraceCount).toBeGreaterThan(0)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}, 20_000)
