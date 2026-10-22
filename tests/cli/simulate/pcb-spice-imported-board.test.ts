import { expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import {
  getPcbSpiceFixture,
  pcbSpiceBoard,
  pcbSpiceDeclarations,
  readPcbSpiceReceipt,
  runPcbSpiceCli,
} from "tests/fixtures/pcb-spice"

test("analog preserves ImportedBoard geometry through TSX and exported Circuit JSON", async () => {
  const cwd =
    await getPcbSpiceFixture(`import { Circuit, analog } from "@tscircuit/core"
import { ImportedBoard } from "pcb-spice-pipeline/tsx"
const source = new Circuit()
source.add(${pcbSpiceBoard})
await source.renderUntilSettled()
const saved = source.getCircuitJson().map(record => Object.fromEntries(Object.entries(record).map(([key, field]) =>
  [key, key.endsWith("_id") && typeof field === "string" ? "saved_" + field : field])))
const savedBoard = saved.find(record => record.type === "pcb_board")
savedBoard.center = {x: 123, y: -45}
saved.push({type: "pcb_stackup", pcb_stackup_id: "saved-stackup", pcb_board_id: savedBoard.pcb_board_id,
  layers: [{layer_type: "copper", layer: "top", thickness: .035},
    {layer_type: "dielectric", thickness: 1.53, relative_permittivity: 4.1},
    {layer_type: "copper", layer: "bottom", thickness: .035}]})
export const modeling = {description: "Saved routing"}
export default () => <ImportedBoard circuitJson={saved}>${pcbSpiceDeclarations}</ImportedBoard>`)
  const result = await runPcbSpiceCli({
    cwd,
    args: ["entry.tsx", "--output", "saved-report"],
  })
  expect(result.stderr).toBe("")
  expect(result.exitCode).toBe(0)
  const { circuitJson } = await readPcbSpiceReceipt(join(cwd, "saved-report"))
  expect(
    circuitJson.find((record) => record.type === "pcb_board")?.pcb_board_id,
  ).toStartWith("saved_")
  expect(
    circuitJson.find((record) => record.type === "pcb_board")?.center,
  ).toEqual({ x: 123, y: -45 })
  expect(
    circuitJson.find((record) => record.type === "pcb_stackup")?.pcb_stackup_id,
  ).toBe("saved-stackup")
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
