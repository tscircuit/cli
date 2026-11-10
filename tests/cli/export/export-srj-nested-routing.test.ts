import { expect, test } from "bun:test"
import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("parent SRJ export keeps the routed child copper fixed", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(
    path.join(tmpDir, "nested.circuit.tsx"),
    `
    export default () => <board width={32} height={20} schematicDisabled autorouter="auto_local">
      <subcircuit name="MODULE" pcbX={0} pcbY={3}>
        <resistor name="R1" resistance={100} footprint="0402" pcbX={-4}/>
        <resistor name="R2" resistance={100} footprint="0402" pcbX={4}/>
        <trace from=".R1 > .pin2" to=".R2 > .pin1"/>
      </subcircuit>
      <resistor name="R3" resistance={100} footprint="0402" pcbX={-4} pcbY={-4}/>
      <resistor name="R4" resistance={100} footprint="0402" pcbX={4} pcbY={-4}/>
      <trace from=".R3 > .pin2" to=".R4 > .pin1"/>
    </board>`,
  )
  const result = await runCommand(
    "tsci export nested.circuit.tsx -f srj -o input.json",
  )
  expect(result.exitCode).toBe(0)
  const srj = JSON.parse(
    await readFile(path.join(tmpDir, "input.json"), "utf8"),
  )
  expect(srj.connections).toHaveLength(1)
  const build = await runCommand(
    "tsci build nested.circuit.tsx --ignore-errors --autorouter-dump-srj all --autorouter-debug-dir routing-inputs",
  )
  expect(build.exitCode).toBe(0)
  const dir = path.join(tmpDir, "routing-inputs")
  const files = (await readdir(dir)).filter((name) =>
    name.endsWith("input.simple-route.json"),
  )
  const inputs = await Promise.all(
    files.map(async (name) =>
      JSON.parse(await readFile(path.join(dir, name), "utf8")),
    ),
  )
  const parent = inputs.find((input) => input.traces?.length === 1)
  expect(parent).toBeDefined()
  expect(srj.connections).toEqual(parent.connections)
  expect(srj.traces).toEqual(parent.traces)
  expect(srj.traces).toHaveLength(1)
  expect(srj.traces[0].route.length).toBeGreaterThan(1)
}, 120_000)
