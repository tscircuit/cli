import { expect, test } from "bun:test"
import { copyFile, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"

async function buildReproduction() {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await copyFile(
    path.join(
      import.meta.dir,
      "../fixtures/assets/kicad-keepout-internal-pad/index.tsx",
    ),
    path.join(tmpDir, "index.tsx"),
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const result = await runCommand("tsci build index.tsx --kicad-project")
  expect(result.exitCode).toBe(0)

  const outputDir = path.join(tmpDir, "dist", "index")
  return {
    tmpDir,
    circuitJsonPath: path.join(outputDir, "circuit.json"),
    pcbPath: path.join(outputDir, "kicad", "index.kicad_pcb"),
  }
}

test("KiCad export drops keepout exclusions and internally connected pad nets", async () => {
  const { circuitJsonPath, pcbPath } = await buildReproduction()
  const circuitJson = JSON.parse(await readFile(circuitJsonPath, "utf8"))

  const sourceComponent = circuitJson.find(
    (element: { type: string; name?: string }) =>
      element.type === "source_component" && element.name === "U1",
  )
  const component = circuitJson.find(
    (element: { type: string; source_component_id?: string }) =>
      element.type === "pcb_component" &&
      element.source_component_id === sourceComponent.source_component_id,
  )
  const keepout = circuitJson.find(
    (element: { type: string }) => element.type === "pcb_keepout",
  )
  const internalConnection = circuitJson.find(
    (element: { type: string }) =>
      element.type === "source_component_internal_connection",
  )

  expect(keepout.excluded_pcb_component_ids).toContain(
    component.pcb_component_id,
  )
  expect(internalConnection.source_port_ids).toHaveLength(2)

  const pcb = await readFile(pcbPath, "utf8")
  const u1Start = pcb.indexOf('(footprint\n    "tscircuit:REPEATED-PAD-TEST"')
  const nextFootprint = pcb.indexOf("\n  (footprint\n", u1Start + 1)
  const u1 = pcb.slice(u1Start, nextFootprint)

  expect(u1.match(/\(pad "1" smd rect/g)).toHaveLength(2)
  expect(u1.match(/\(net \d+ "GND"\)/g)).toHaveLength(1)
  expect(pcb).toMatch(/\(keepout[\s\S]*?\(footprints not_allowed\)/)
}, 60_000)

test.skipIf(process.env.RUN_KICAD_DRC !== "1")(
  "native KiCad DRC reports the false keepout and shorting violations",
  async () => {
    const { tmpDir, pcbPath } = await buildReproduction()
    const reportPath = path.join(tmpDir, "drc.json")
    const result = Bun.spawnSync([
      "kicad-cli",
      "pcb",
      "drc",
      "--format",
      "json",
      "--output",
      reportPath,
      pcbPath,
    ])
    expect(result.exitCode).toBe(0)

    const report = JSON.parse(await readFile(reportPath, "utf8"))
    expect(report.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "items_not_allowed",
          items: expect.arrayContaining([
            expect.objectContaining({ description: "Footprint U1" }),
          ]),
        }),
        expect.objectContaining({
          type: "shorting_items",
          items: expect.arrayContaining([
            expect.objectContaining({
              description: expect.stringContaining("[GND] of U1"),
            }),
            expect.objectContaining({
              description: expect.stringContaining("[<no net>] of U1"),
            }),
          ]),
        }),
      ]),
    )
  },
  60_000,
)
