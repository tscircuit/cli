import { expect, test } from "bun:test"
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { loadAnalogInput } from "cli/simulate/load-analog-input"

test("raw, wrapped and named Circuit JSON use explicit modeling without a preliminary render", async () => {
  const projectDir = await mkdtemp(join(tmpdir(), "analog-input-"))
  try {
    await symlink(
      join(process.cwd(), "node_modules"),
      join(projectDir, "node_modules"),
    )
    await writeFile(join(projectDir, "package.json"), "{}")
    const records = [
      {
        type: "pcb_board",
        pcb_board_id: "saved-board",
        width: 10,
        height: 6,
        center: { x: 0, y: 0 },
        num_layers: 2,
      },
    ]
    const modeling = { description: "caller configuration" }
    const load = (name: string) =>
      loadAnalogInput({
        file: join(projectDir, name),
        projectDir,
        platformConfig: {},
      })
    await writeFile(join(projectDir, "circuit.json"), JSON.stringify(records))
    expect((await load("circuit.json")).circuitJson as unknown).toEqual(records)
    await writeFile(
      join(projectDir, "circuit.json.gz"),
      gzipSync(JSON.stringify(records)),
    )
    await writeFile(
      join(projectDir, "pipeline.json"),
      JSON.stringify({ circuit: "circuit.json.gz", ...modeling }),
    )
    const wrapped = await load("pipeline.json")
    expect(wrapped.circuitJson as unknown).toEqual(records)
    expect(wrapped.modeling?.description).toBe(modeling.description)
    await writeFile(
      join(projectDir, "named.tsx"),
      `export const circuitJson = ${JSON.stringify(records)}
export const modeling = ${JSON.stringify(modeling)}
export default function MustNotRender() { throw new Error("named records must take precedence") }`,
    )
    const named = await load("named.tsx")
    expect(
      named.circuitJson.filter(
        (record) => record.type !== "source_project_metadata",
      ) as unknown,
    ).toEqual(records)
    expect(named.modeling?.description).toBe(modeling.description)
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
}, 30_000)
