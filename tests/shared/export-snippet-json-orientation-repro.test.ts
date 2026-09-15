import { expect, test } from "bun:test"
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import JSZip from "jszip"
import Papa from "papaparse"
import { exportSnippet } from "lib/shared/export-snippet"

// Deterministic supplier fixture: no external JLCPCB request. Both supplier
// footprints have pin 1 at right/bottom; the authored footprints face oppositely.
const supplierPads = [
  [1, 1, -0.95],
  [2, 1, 0.95],
  [3, -1, 0],
].map(([pin, x, y]) => ({
  type: "pcb_smtpad",
  pcb_smtpad_id: `pad_${pin}`,
  pcb_component_id: "supplier_component",
  shape: "rect",
  layer: "top",
  x,
  y,
  width: 1,
  height: 0.65,
  port_hints: [`pin${pin}`],
}))
const source = `
const supplierPads = ${JSON.stringify(supplierPads)}
const partsEngine = {
  findPart: async () => [],
  fetchPartCircuitJson: async () => supplierPads,
}
export default () => <board width={20} height={10} routingDisabled partsEngine={partsEngine}>
  {[
    {name:"Q_PD_ENABLE", x:-4, sign:-1, part:"C85202"},
    {name:"Q_BUZZER", x:4, sign:1, part:"C20917"},
  ].map(({name,x,sign,part}) => <chip key={name} name={name} pcbX={x} pcbY={0}
    supplierPartNumbers={{jlcpcb:[part]}}
    pinLabels={{pin1:["G"],pin2:["S"],pin3:["D"]}}
    footprint={<footprint>
      <smtpad portHints={["pin1"]} pcbX={sign} pcbY={-0.95*sign} width={1} height={0.65} shape="rect"/>
      <smtpad portHints={["pin2"]} pcbX={sign} pcbY={0.95*sign} width={1} height={0.65} shape="rect"/>
      <smtpad portHints={["pin3"]} pcbX={-sign} pcbY={0} width={1} height={0.65} shape="rect"/>
    </footprint>}/>) }
</board>
`

// Intentionally failing regression: JSON fabrication must preserve the supplier
// orientation produced by exporting the same source directly.
test("REPRO: TSX and prebuilt JSON fabrication exports must agree on SOT-23 rotations", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "tsci-json-orientation-repro-"))
  const sourcePath = path.join(dir, "board.circuit.tsx")
  const jsonPath = path.join(dir, "board.circuit.json")
  const cache = new Map<string, string>()
  const platformConfig = {
    localCacheEngine: {
      getItem: (key: string) => cache.get(key) ?? null,
      setItem: (key: string, value: string) => {
        cache.set(key, value)
      },
    },
  }
  async function run(filePath: string, format: "gerbers" | "circuit-json") {
    let content: string | Buffer | undefined
    let exit: number | undefined
    await exportSnippet({
      filePath,
      format,
      writeFile: false,
      platformConfig,
      onSuccess: (r) => {
        content = r.outputContent
      },
      onError: (message) => {
        throw new Error(message)
      },
      onExit: (code) => {
        exit = code
      },
    })
    expect(exit).toBe(0)
    expect(content).toBeDefined()
    return content!
  }
  async function rotations(content: string | Buffer) {
    const zip = await JSZip.loadAsync(content)
    const csv = await zip.file("pick_and_place.csv")!.async("string")
    const rows = Papa.parse<Record<string, string>>(csv, { header: true }).data
    return Object.fromEntries(
      rows.map((r) => [r.Designator, Number(r.Rotation)]),
    )
  }
  try {
    await symlink(
      path.join(process.cwd(), "node_modules"),
      path.join(dir, "node_modules"),
      "dir",
    )
    await writeFile(sourcePath, source)
    const built = await run(sourcePath, "circuit-json")
    const json = JSON.parse(String(built))
    const components = json.filter((e: any) => e.type === "pcb_component")
    expect(components).toHaveLength(2)
    expect(
      components.every(
        (e: any) => !e.pin1_location && !e.supplier_pin1_location_map,
      ),
    ).toBe(true)
    await writeFile(jsonPath, String(built))
    const direct = await rotations(await run(sourcePath, "gerbers"))
    const prebuilt = await rotations(await run(jsonPath, "gerbers"))
    console.log("TSX fabrication:", direct, "JSON fabrication:", prebuilt)
    expect(direct).toEqual({ Q_PD_ENABLE: 180, Q_BUZZER: 0 })
    // Current behavior: success with Q_PD_ENABLE=0, no missing-orientation error.
    expect(prebuilt).toEqual(direct)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}, 120_000)
