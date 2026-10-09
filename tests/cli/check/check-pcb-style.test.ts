import { expect, test } from "bun:test"
import { readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  analyzePcbStyle,
  renderPcbStyleSvg,
} from "@tscircuit/circuit-json-pcb-style-analysis"
import type { CircuitJson } from "circuit-json"
import {
  checkPcbStyle,
  loadPcbStyleAnalysis,
  PCB_STYLE_CDN_URL,
} from "../../../cli/check/pcb-style/register"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const trace = (points: Array<[number, number]>): CircuitJson => [
  {
    type: "pcb_trace",
    pcb_trace_id: "style-trace",
    route: points.map(([x, y]) => ({
      route_type: "wire",
      x,
      y,
      width: 0.15,
      layer: "top",
    })),
  },
]

const oddAngle = trace([[0, 0], [10, 3]])
const staircasePoints: Array<[number, number]> = [[0, 0]]
for (let i = 0; i < 10; i++) {
  const [x, y] = staircasePoints[staircasePoints.length - 1]!
  staircasePoints.push([x + (i % 2 === 0 ? 0 : 0.4), y + 0.4])
}
const staircase = trace(staircasePoints)

test("PCB style loads the latest jscdn module", async () => {
  let requestedUrl
  const analyzer = { analyzePcbStyle, renderPcbStyleSvg }
  const result = await loadPcbStyleAnalysis({
    preferCdn: true,
    importFromCdn: async (url) => {
      requestedUrl = url
      return analyzer
    },
  })
  expect(requestedUrl).toBe(PCB_STYLE_CDN_URL)
  expect(requestedUrl).toContain("/latest/+esm")
  expect(result).toBe(analyzer)
})

test("PCB style falls back to the packaged analyzer offline", async () => {
  const analyzer = await loadPcbStyleAnalysis({
    preferCdn: true,
    importFromCdn: async () => {
      throw new Error("CDN unavailable")
    },
  })
  expect(analyzer.analyzePcbStyle(staircase).issues[0]?.lineItemType).toBe(
    "PcbTraceStaircase",
  )
})

test("PCB style falls back when the CDN module has incompatible exports", async () => {
  const analyzer = await loadPcbStyleAnalysis({
    preferCdn: true,
    importFromCdn: async () => ({}) as never,
  })
  expect(analyzer.analyzePcbStyle(oddAngle).issues).toHaveLength(1)
})

test("tsci check pcb-style reports issues and writes a counted overview", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const file = path.join(tmpDir, "odd.circuit.json")
  await writeFile(file, JSON.stringify(oddAngle))
  const result = await runCommand(`tsci check pcb-style ${file}`)
  const svg = await readFile(
    path.join(tmpDir, "checks", "check-pcb-style", "pcb.svg"),
    "utf8",
  )
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toBe("")
  expect(result.stdout).toContain("Detected 1 PCB style issue")
  expect(result.stdout).toContain("PcbTraceSegmentOddAngle")
  expect(result.stdout).toContain("style-trace")
  expect(result.stdout).toContain("route 0 -> 1")
  expect(svg).toContain("1 errors")
  expect(svg).toContain("<line")
}, 30_000)

test("subdividing odd-angle copper still reports one issue", async () => {
  const { tmpDir } = await getCliTestFixture()
  const file = path.join(tmpDir, "subdivided.circuit.json")
  const points = Array.from(
    { length: 21 },
    (_, i): [number, number] => [i / 2, (i / 2) * 0.3],
  )
  await writeFile(file, JSON.stringify(trace(points)))
  const result = await checkPcbStyle(file)
  expect(result.analysis.issues).toHaveLength(1)
  expect(result.analysis.issues[0]?.lineItemType).toBe(
    "PcbTraceSegmentOddAngle",
  )
})

test("tsci check pcb-style detects allowed-angle stair stepping with clean JSON output", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const file = path.join(tmpDir, "stairs.circuit.json")
  const svgPath = path.join(tmpDir, "snapshots", "stairs.svg")
  await writeFile(file, JSON.stringify(staircase))
  const result = await runCommand(
    `tsci check pcb-style ${file} --json --svg ${svgPath}`,
  )
  const analysis = JSON.parse(result.stdout)
  expect(result.exitCode).toBe(1)
  expect(analysis.issues).toHaveLength(1)
  expect(analysis.issues[0].lineItemType).toBe("PcbTraceStaircase")
  expect(result.stderr).toContain(svgPath)
  expect(await readFile(svgPath, "utf8")).toContain("1 errors")
}, 30_000)

test("tsci check pcb-style accepts clean copper and replaces stale highlights", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const file = path.join(tmpDir, "board.circuit.json")
  await writeFile(file, JSON.stringify(oddAngle))
  await runCommand(`tsci check pcb-style ${file}`)
  await writeFile(file, JSON.stringify(trace([[0, 0], [10, 0]])))
  const result = await runCommand(`tsci check pcb-style ${file}`)
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("No PCB style issues detected")
  const svg = await readFile(
    path.join(tmpDir, "checks", "check-pcb-style", "pcb.svg"),
    "utf8",
  )
  expect(svg).toContain("0 errors")
}, 30_000)

test("PCB style forwards thresholds and rule selection", async () => {
  const { tmpDir } = await getCliTestFixture()
  const file = path.join(tmpDir, "board.circuit.json")
  await writeFile(file, JSON.stringify(oddAngle))
  expect(
    (await checkPcbStyle(file, { maxSegmentLength: "20" })).analysis.issues,
  ).toHaveLength(0)
  expect(
    (await checkPcbStyle(file, { issueType: "staircase" })).analysis.issues,
  ).toHaveLength(0)
  await writeFile(file, JSON.stringify(staircase))
  expect(
    (await checkPcbStyle(file, { minStaircaseBends: "20" })).analysis.issues,
  ).toHaveLength(0)
})

test("PCB style rejects invalid input and threshold options", async () => {
  const { tmpDir } = await getCliTestFixture()
  const file = path.join(tmpDir, "invalid.circuit.json")
  await writeFile(file, JSON.stringify({ circuitJson: oddAngle }))
  await expect(checkPcbStyle(file)).rejects.toThrow("Circuit JSON array")
  await writeFile(file, "{")
  await expect(checkPcbStyle(file)).rejects.toThrow()
  await expect(
    checkPcbStyle(file, { maxSegmentLength: "NaN" }),
  ).rejects.toThrow("--max-segment-length must be a finite number")
  await expect(
    checkPcbStyle(file, { minStaircaseBends: "2.5" }),
  ).rejects.toThrow()
  await expect(
    checkPcbStyle(file, { issueType: "other" }),
  ).rejects.toThrow("--issue-type")
  await expect(checkPcbStyle(file, { svg: file })).rejects.toThrow("--svg")
})

test("PCB style routes a source board before analyzing its copper", async () => {
  const { tmpDir } = await getCliTestFixture()
  await symlink(
    path.join(process.cwd(), "node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
  const file = path.join(tmpDir, "board.tsx")
  await writeFile(
    file,
    `export default () => (
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" pcbX={-2} />
        <resistor name="R2" resistance="1k" footprint="0402" pcbX={2} />
        <trace from=".R1 > .pin1" to=".R2 > .pin1" />
      </board>
    )`,
  )
  const result = await checkPcbStyle(file)
  expect(result.analysis.issues).toHaveLength(0)
  expect(result.svg).toContain("<line")
}, 30_000)
