import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuit = `export default () => (
  <board width={16} height={12} layers={4} routeRemaining={false}
    minTraceWidth={0.1} minViaPadDiameter={0.4} minViaHoleDiameter={0.15}>
    <fanout name="BGA" pcbX={2} pcbY={-1} autorouter="dogbone" fanoutRoutingLayers={["inner2"]}>
      <chip name="U1" connections={{pin1: "net.SIGNAL", pin2: "net.VCC", pin3: "net.GND", pin4: "net.DATA"}}
        footprint={<footprint>
          <smtpad portHints={["1"]} shape="circle" radius={0.25} pcbX={0} pcbY={0} />
          <smtpad portHints={["2"]} shape="circle" radius={0.25} pcbX={1} pcbY={0} />
          <smtpad portHints={["3"]} shape="circle" radius={0.25} pcbX={0} pcbY={1} />
          <smtpad portHints={["4"]} shape="circle" radius={0.25} pcbX={1} pcbY={1} />
        </footprint>} />
    </fanout>
  </board>
)`

test("build captures dogbone paths that can be edited and replayed on fanout", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await fs.writeFile(path.join(tmpDir, "package.json"), "{}")
  await fs.mkdir(path.join(tmpDir, "node_modules"))
  await fs.symlink(
    path.resolve("node_modules/react"),
    path.join(tmpDir, "node_modules/react"),
    "dir",
  )
  await fs.writeFile(path.join(tmpDir, "board.circuit.tsx"), circuit)
  const result = await runCommand("tsci build board.circuit.tsx")
  expect(result.exitCode).toBe(0)
  expect(result.stderr).not.toContain("Could not save autorouting paths")
  const artifactDir = path.join(tmpDir, ".tscircuit/autorouting-artifacts")
  const [entry] = await fs.readdir(artifactDir)
  const files = await fs.readdir(path.join(artifactDir, entry!))
  const paths = JSON.parse(
    await fs.readFile(path.join(artifactDir, entry!, files[0]!), "utf8"),
  )
  expect(paths).toHaveLength(4)
  // A small width adjustment preserves endpoints and demonstrates editable copper.
  for (const savedPath of paths) {
    for (const point of savedPath.route) {
      if (point.route_type === "wire") point.width = 0.11
    }
  }
  const first = paths[0].route[0]
  const next = paths[0].route[1]
  const bend = {
    ...first,
    x: (first.x + next.x) / 2 + 0.025,
    y: (first.y + next.y) / 2,
  }
  paths[0].route.splice(1, 0, bend)
  await fs.writeFile(
    path.join(tmpDir, "saved-fanout.json"),
    JSON.stringify(paths),
  )
  await fs.writeFile(
    path.join(tmpDir, "replay.circuit.tsx"),
    'import savedPaths from "./saved-fanout.json"\n' +
      circuit.replace(
        'autorouter="dogbone"',
        'autorouter="dogbone" pcbTracePaths={savedPaths}',
      ),
  )
  const replay = await runCommand("tsci build replay.circuit.tsx")
  expect(replay.exitCode).toBe(0)
  expect(replay.stderr).not.toContain("Could not save autorouting paths")
  const output = JSON.parse(
    await fs.readFile(path.join(tmpDir, "dist/replay/circuit.json"), "utf8"),
  )
  expect(output.filter((e: any) => e.type.endsWith("_error"))).toEqual([])
  expect(output.filter((e: any) => e.type === "pcb_via")).toHaveLength(4)
  const traces = output.filter((e: any) => e.type === "pcb_trace")
  expect(traces).toHaveLength(4)
  expect(
    traces.some((trace: any) =>
      trace.route.some(
        (point: any) =>
          Math.abs(point.x - (bend.x + 2)) < 1e-6 &&
          Math.abs(point.y - (bend.y - 1)) < 1e-6,
      ),
    ),
  ).toBe(true)
  for (const trace of traces) {
    expect(
      trace.route
        .filter((p: any) => p.route_type === "wire")
        .every((p: any) => p.width === 0.11),
    ).toBe(true)
  }
}, 60_000)
