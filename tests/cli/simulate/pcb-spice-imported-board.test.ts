import { expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import {
  getPcbSpiceFixture,
  pcbSpiceDeclarations,
  readPcbSpiceReceipt,
  runPcbSpiceCli,
} from "tests/fixtures/pcb-spice"

test("analog preserves ImportedBoard geometry through TSX and exported Circuit JSON", async () => {
  const cwd =
    await getPcbSpiceFixture(`import { writeFile } from "node:fs/promises"
import { Circuit, analog } from "@tscircuit/core"
import { ImportedBoard } from "pcb-spice-pipeline/tsx"
const source = new Circuit()
source.add(<board width={10} height={10} schematicDisabled>
  <chip name="U1" pinLabels={{pin1: "DATA", pin2: "GND", pin3: "VCC"}} footprint="sot23" />
  <resistor name="R1" resistance="50" footprint="0402" pcbX={-3} pcbY={0.95} />
  <trace from=".U1 > .DATA" to=".R1 > .pin2" pcbStraightLine />
</board>)
await source.renderUntilSettled()
const saved = JSON.parse(JSON.stringify(source.getCircuitJson()), (key, field) => {
  if (key.endsWith("_ids") && Array.isArray(field)) return field.map(id => "saved_" + id)
  return key.endsWith("_id") && typeof field === "string" ? "saved_" + field : field
})
const savedBoard = saved.find(record => record.type === "pcb_board")
saved.push({type: "pcb_stackup", pcb_stackup_id: "saved-stackup", pcb_board_id: savedBoard.pcb_board_id,
  layers: [{layer_type: "copper", layer: "top", thickness: .035},
    {layer_type: "dielectric", thickness: 1.53, relative_permittivity: 4.1},
    {layer_type: "copper", layer: "bottom", thickness: .035}]})
await writeFile("saved.json", JSON.stringify(saved))
export const modeling = {description: "Saved routing"}
export default () => <ImportedBoard circuitJson={saved}>${pcbSpiceDeclarations}</ImportedBoard>`)
  const result = await runPcbSpiceCli({
    cwd,
    args: ["entry.tsx", "--output", "saved-report"],
  })
  expect(result.stderr).toBe("")
  expect(result.exitCode).toBe(0)
  const { circuitJson } = await readPcbSpiceReceipt(join(cwd, "saved-report"))
  const saved = await Bun.file(join(cwd, "saved.json")).json()
  expect(circuitJson.slice(0, saved.length)).toEqual(saved)
  const sourceTrace = circuitJson.find(
    (record) => record.type === "source_trace",
  )
  expect(sourceTrace?.connected_source_port_ids).toHaveLength(2)
  for (const sourcePortId of sourceTrace!.connected_source_port_ids) {
    expect(
      circuitJson.some(
        (record) =>
          record.type === "source_port" &&
          record.source_port_id === sourcePortId,
      ),
    ).toBe(true)
  }
  expect(
    circuitJson.filter((record) => record.type === "pcb_trace"),
  ).toHaveLength(1)
  expect(
    circuitJson.find((record) => record.type === "simulation_ibis_model")
      ?.source_component_id,
  ).toStartWith("saved_")
  expect(
    circuitJson.find((record) => record.type === "simulation_voltage_probe")
      ?.signal_input_source_port_id,
  ).toStartWith("saved_")

  await writeFile(
    join(cwd, "exported.ts"),
    `export const circuitJson = ${JSON.stringify(circuitJson)}
export const modeling = {description: "Exported records"}`,
  )
  const exported = await runPcbSpiceCli({
    cwd,
    args: ["exported.ts", "--output", "exported-report"],
  })
  expect(exported.exitCode).toBe(0)
  expect(
    (await readPcbSpiceReceipt(join(cwd, "exported-report"))).circuitJson,
  ).toEqual(circuitJson)

  await mkdir(join(cwd, "simulation"))
  await writeFile(
    join(cwd, "circuit.json.gz"),
    gzipSync(JSON.stringify(circuitJson)),
  )
  await writeFile(
    join(cwd, "simulation", "entry.json"),
    '{"circuit":"../circuit.json.gz","description":"JSON modeling"}',
  )
  const json = await runPcbSpiceCli({
    cwd,
    args: ["simulation/entry.json", "--output", "json-report"],
  })
  expect(json.exitCode).toBe(0)
  const receipt = await readPcbSpiceReceipt(join(cwd, "json-report"))
  expect(receipt.circuitJson).toEqual(circuitJson)
  expect(receipt.modeling.description).toBe("JSON modeling")

  await writeFile(join(cwd, "circuit.json"), JSON.stringify(circuitJson))
  const raw = await runPcbSpiceCli({ cwd, args: ["circuit.json"] })
  expect(raw.exitCode).not.toBe(0)
  expect(raw.stderr).toContain(
    "pipeline JSON entry with modeling and a circuit path",
  )
}, 60000)
