import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  getSourceFilesystemMd5Hash,
  readCurrentCircuitJsonBuild,
} from "lib/shared/circuit-json-build-cache"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
      schX={3}
      pcbX={3}
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      schX={-3}
      pcbX={-3}
    />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)`

test("export srj from circuit.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitTsxPath = path.join(tmpDir, "test-circuit.tsx")

  await writeFile(circuitTsxPath, circuitCode)

  const circuitJsonResult = await runCommand(
    `tsci export ${circuitTsxPath} -f circuit-json`,
  )
  expect(circuitJsonResult.stderr).toBe("")
  expect(circuitJsonResult.exitCode).toBe(0)

  const circuitJsonPath = path.join(tmpDir, "test-circuit.circuit.json")
  const srjResult = await runCommand(`tsci export -f srj ${circuitJsonPath}`)

  expect(srjResult.stderr).toBe("")
  expect(srjResult.exitCode).toBe(0)

  const srj = await readFile(
    path.join(tmpDir, "test-circuit.circuit.simple-route.json"),
    "utf-8",
  )
  const parsedSrj = JSON.parse(srj)

  expect(typeof parsedSrj).toBe("object")
  expect(parsedSrj).not.toBeNull()
  expect(parsedSrj).not.toHaveProperty("simpleRouteJson")
  expect(parsedSrj).toHaveProperty("layerCount")
  expect(parsedSrj).toHaveProperty("bounds")
  expect(Array.isArray(parsedSrj.obstacles)).toBe(true)
  expect(parsedSrj.connections).toEqual([])
  expect(parsedSrj.traces).toHaveLength(1)
})

test("export srj from TSX before autorouting, even with a current routed build", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    env: { DEBUG: "tscircuit:core:_runLocalAutorouting" },
  })
  const filePath = path.join(tmpDir, "unrouted.circuit.tsx")
  await writeFile(
    filePath,
    `export default () => (
      <board width={24} height={18} schematicDisabled minTraceWidth={0.1}
        defaultTraceWidth={0.35} autorouter="auto_local">
        <resistor name="R1" resistance="1k" footprint="0402" pcbX={-5} pcbY={-4} />
        <resistor name="R2" resistance="1k" footprint="0402" pcbX={5} pcbY={-4} />
        <trace from=".R1 > .pin2" to=".R2 > .pin1" thickness={0.55} />
        <subcircuit name="MODULE" pcbX={0} pcbY={4}>
          <resistor name="R3" resistance="1k" footprint="0402" pcbX={-5} />
          <resistor name="R4" resistance="1k" footprint="0402" pcbX={5} />
          <trace from=".R3 > .pin2" to=".R4 > .pin1" />
        </subcircuit>
        <resistor name="R5" resistance="1k" footprint="0402" pcbX={-5} pcbY={0} />
        <resistor name="R6" resistance="1k" footprint="0402" pcbX={5} pcbY={0} />
        <trace from=".R5 > .pin2" to=".R6 > .pin1" pcbStraightLine />
      </board>
    )`,
  )

  const exportSrj = async (output: string) => {
    const result = await runCommand(
      `tsci export unrouted.circuit.tsx -f srj -o ${output}`,
    )
    expect(result.exitCode).toBe(0)
    expect(result.stderr).not.toContain("starting local autorouting")
    expect(result.stdout).not.toContain("Saved autorouting paths")
    return JSON.parse(await readFile(path.join(tmpDir, output), "utf8"))
  }

  const cold = await exportSrj("cold.srj")
  expect(cold.connections).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ nominalTraceWidth: 0.55 }),
      expect.objectContaining({ nominalTraceWidth: 0.35 }),
    ]),
  )
  expect(cold.connections).toHaveLength(2)
  expect(cold.traces).toHaveLength(1)
  expect(cold.minTraceWidth).toBe(0.1)

  const build = await runCommand("tsci build unrouted.circuit.tsx")
  expect(build.exitCode).toBe(0)
  expect(build.stderr).toContain("starting local autorouting")
  const cachedBuild = readCurrentCircuitJsonBuild({
    filePath,
    sourceFilesystemMd5Hash: getSourceFilesystemMd5Hash(filePath),
  })
  expect(
    cachedBuild?.circuitJson.filter(({ type }) => type === "pcb_trace"),
  ).toHaveLength(3)

  expect(await exportSrj("warm.srj")).toEqual(cold)
}, 30_000)
