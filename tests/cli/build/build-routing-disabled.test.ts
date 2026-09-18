import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build supports --routing-disabled flag", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const circuitPath = path.join(tmpDir, "routing-disabled.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout, exitCode } = await runCommand(
    `tsci build ${circuitPath} --routing-disabled`,
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Build complete")
}, 30_000)

const routerProbeFilename = "router-invocations.txt"
const routerProbeError = "Connected-board test router was invoked"

const connectedCircuitCode = `
import { appendFileSync } from "node:fs"

async function recordRouterInvocation(simpleRouteJson: {
  connections: readonly { name: string }[]
}) {
  appendFileSync(
    new URL("./${routerProbeFilename}", import.meta.url),
    String(simpleRouteJson.connections.length) + "\\n",
  )
  throw new Error("${routerProbeError}")
}

export default () => (
  <board
    width="12mm"
    height="8mm"
    layers={2}
    autorouter={{ local: true, algorithmFn: recordRouterInvocation }}
  >
    <resistor
      name="R1"
      resistance="1k"
      footprint="0402"
      schX={-2}
      pcbX={-2}
      pcbY={0}
    />
    <resistor
      name="R2"
      resistance="2k"
      footprint="0402"
      schX={2}
      pcbX={2}
      pcbY={0}
    />
    <trace from=".R1 > .pin2" to=".R2 > .pin1" />
  </board>
)
`

test("build --routing-disabled bypasses an exercised router and preserves connected-board placement", async () => {
  const control = await getCliTestFixture()
  const entrypoint = "connected-preview.circuit.tsx"
  const controlSourcePath = path.join(control.tmpDir, entrypoint)
  const controlProbePath = path.join(control.tmpDir, routerProbeFilename)
  await writeFile(path.join(control.tmpDir, "package.json"), "{}")
  await writeFile(controlSourcePath, connectedCircuitCode)
  expect(existsSync(controlProbePath)).toBe(false)

  // A fresh CLI process must actually call the custom PCB router with a
  // connection to route. An ignored algorithmFn must fail this control, not
  // produce a vacuous passing "not called" assertion in the preview build.
  const buildCommand =
    `tsci build ${entrypoint}` +
    " --disable-parts-engine --autorouter-timeout 5s"
  const controlResult = await control.runCommand(buildCommand)
  expect(existsSync(controlProbePath)).toBe(true)
  const connectionCounts = (await readFile(controlProbePath, "utf-8"))
    .trim()
    .split("\n")
    .map(Number)
  expect(connectionCounts.length).toBeGreaterThan(0)
  expect(
    connectionCounts.every((count) => Number.isInteger(count) && count > 0),
  ).toBe(true)
  // Failure is intentional only in the positive control: the router throws
  // after recording its invocation, so no real solver or service is needed.
  expect(controlResult.exitCode).not.toBe(0)
  expect(`${controlResult.stdout}\n${controlResult.stderr}`).toContain(
    routerProbeError,
  )
  expect(await readFile(controlSourcePath, "utf-8")).toBe(connectedCircuitCode)

  // Do not reuse the control's outputs or cache. Both runs get identical
  // source; only the CLI flag changes.
  const preview = await getCliTestFixture()
  const previewSourcePath = path.join(preview.tmpDir, entrypoint)
  const previewProbePath = path.join(preview.tmpDir, routerProbeFilename)
  const outputPath = path.join(
    preview.tmpDir,
    "dist",
    "connected-preview",
    "circuit.json",
  )
  await writeFile(path.join(preview.tmpDir, "package.json"), "{}")
  await writeFile(previewSourcePath, connectedCircuitCode)
  expect(existsSync(previewProbePath)).toBe(false)
  expect(existsSync(outputPath)).toBe(false)
  expect(existsSync(path.join(preview.tmpDir, ".tscircuit", "cache"))).toBe(
    false,
  )

  const previewResult = await preview.runCommand(
    `${buildCommand} --routing-disabled`,
  )
  expect(previewResult.exitCode).toBe(0)
  expect(previewResult.stdout).toContain("Build complete")
  expect(existsSync(previewProbePath)).toBe(false)
  expect(await readFile(previewSourcePath, "utf-8")).toBe(connectedCircuitCode)

  const circuitJson: AnyCircuitElement[] = JSON.parse(
    await readFile(outputPath, "utf-8"),
  )
  const boards = circuitJson.filter((elm) => elm.type === "pcb_board")
  expect(boards).toHaveLength(1)
  expect(boards[0]).toMatchObject({
    width: 12,
    height: 8,
    num_layers: 2,
  })

  const sourceComponents = circuitJson.filter(
    (elm) => elm.type === "source_component",
  )
  const pcbComponents = circuitJson.filter(
    (elm) => elm.type === "pcb_component",
  )
  const schematicComponents = circuitJson.filter(
    (elm) => elm.type === "schematic_component",
  )
  const sourcePorts = circuitJson.filter((elm) => elm.type === "source_port")
  const pcbPorts = circuitJson.filter((elm) => elm.type === "pcb_port")
  expect(sourceComponents.map((component) => component.name).sort()).toEqual([
    "R1",
    "R2",
  ])
  expect(pcbComponents).toHaveLength(2)
  expect(schematicComponents).toHaveLength(2)
  expect(sourcePorts).toHaveLength(4)
  expect(pcbPorts).toHaveLength(4)
  expect(new Set(sourcePorts.map((port) => port.source_port_id)).size).toBe(4)
  expect(circuitJson.filter((elm) => elm.type === "pcb_smtpad")).toHaveLength(4)

  const connectedSourcePortIds: string[] = []
  for (const [name, pcbX, connectedPin] of [
    ["R1", -2, 2],
    ["R2", 2, 1],
  ] as const) {
    const sourceComponent = sourceComponents.find(
      (component) => component.name === name,
    )
    if (!sourceComponent) throw new Error(`Missing source component ${name}`)

    const componentPlacements = pcbComponents.filter(
      (component) =>
        component.source_component_id === sourceComponent.source_component_id,
    )
    expect(componentPlacements).toHaveLength(1)
    const pcbComponent = componentPlacements[0]!
    expect(pcbComponent).toMatchObject({
      center: { x: pcbX, y: 0 },
      layer: "top",
    })
    expect(
      schematicComponents.filter(
        (component) =>
          component.source_component_id === sourceComponent.source_component_id,
      ),
    ).toHaveLength(1)

    for (const pinNumber of [1, 2]) {
      const matchingPorts = sourcePorts.filter(
        (port) =>
          port.source_component_id === sourceComponent.source_component_id &&
          port.pin_number === pinNumber,
      )
      expect(matchingPorts).toHaveLength(1)
      const sourcePort = matchingPorts[0]!
      const matchingPcbPorts = pcbPorts.filter(
        (port) =>
          port.source_port_id === sourcePort.source_port_id &&
          port.pcb_component_id === pcbComponent.pcb_component_id,
      )
      expect(matchingPcbPorts).toHaveLength(1)
      expect(Number.isFinite(matchingPcbPorts[0]!.x)).toBe(true)
      expect(Number.isFinite(matchingPcbPorts[0]!.y)).toBe(true)
      if (pinNumber === connectedPin) {
        connectedSourcePortIds.push(sourcePort.source_port_id)
      }
    }
  }

  const sourceTraces = circuitJson.filter((elm) => elm.type === "source_trace")
  expect(sourceTraces).toHaveLength(1)
  expect([...sourceTraces[0]!.connected_source_port_ids].sort()).toEqual(
    connectedSourcePortIds.sort(),
  )
  expect(circuitJson.filter((elm) => elm.type === "pcb_trace")).toHaveLength(0)
  expect(circuitJson.filter((elm) => elm.type === "pcb_via")).toHaveLength(0)
}, 60_000)
