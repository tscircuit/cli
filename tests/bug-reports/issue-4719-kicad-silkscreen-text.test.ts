import { expect, test } from "bun:test"
import { copyFile, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"

// Reproduction of https://github.com/tscircuit/cli/issues/4719.
// These assertions document the bug, not the desired export behavior. Update
// them when font metrics/stroke preservation is implemented in the exporter.
async function buildReproduction() {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await copyFile(
    path.join(import.meta.dir, "../fixtures/assets/issue-4719/index.tsx"),
    path.join(tmpDir, "index.tsx"),
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  const result = await runCommand("tsci build index.tsx --svgs --kicad-project")
  expect(result.exitCode).toBe(0)
  const outputDir = path.join(tmpDir, "dist", "index")
  return {
    tmpDir,
    outputDir,
    pcbPath: path.join(outputDir, "kicad", "index.kicad_pcb"),
  }
}

test("issue #4719: KiCad export substitutes native font metrics and a fixed stroke", async () => {
  const { outputDir, pcbPath } = await buildReproduction()
  const circuitJson = JSON.parse(
    await readFile(path.join(outputDir, "circuit.json"), "utf8"),
  )
  const text = circuitJson.find(
    (element: { type: string }) => element.type === "pcb_silkscreen_text",
  )
  expect(text).toMatchObject({
    text: "SN74LVC1G17DCKR",
    font_size: 0.8,
    anchor_position: { x: 0, y: 0 },
  })
  const svg = await readFile(path.join(outputDir, "pcb.svg"), "utf8")
  expect(svg).toContain("SN74LVC1G17DCKR")
  expect(svg).toContain('font-family="Arial, sans-serif"')
  const pcb = await readFile(pcbPath, "utf8")
  expect(pcb).toMatch(
    /\(gr_text\s+"SN74LVC1G17DCKR"[\s\S]*?\(font\s+\(size 0\.8 0\.8\)\s+\(thickness 0\.15\)/,
  )
}, 60_000)

// KiCad is not a CI dependency. Opt in to verify the actual geometry rather
// than inferring DRC results from serialized text size alone.
test.skipIf(process.env.RUN_KICAD_DRC !== "1")(
  "issue #4719: native KiCad DRC confirms the label is clipped by the board edge",
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
    // DRC normally exits successfully even when it reports violations.
    expect(result.exitCode).toBe(0)
    const report = JSON.parse(await readFile(reportPath, "utf8"))
    expect(report.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "silk_edge_clearance",
          items: expect.arrayContaining([
            expect.objectContaining({
              description: expect.stringContaining("SN74LVC1G17DCKR"),
            }),
          ]),
        }),
      ]),
    )
  },
  60_000,
)
