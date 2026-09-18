import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"
import { generateKicadProject } from "cli/build/generate-kicad-project"

test("generateKicadProject preserves explicit board design-rule limits", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      width: 10,
      height: 10,
      center: { x: 0, y: 0 },
      thickness: 1.6,
      num_layers: 2,
      material: "fr4" as const,
      min_trace_width: 0.25,
      min_board_edge_clearance: 0.3,
    },
  ]

  const project = await generateKicadProject({
    circuitJson,
    outputDir: "/tmp/fake-kicad-project",
    projectName: "custom-board",
    writeFiles: false,
  })

  expect(project.proContent).toBeDefined()
  const proJson = JSON.parse(project.proContent)

  expect(proJson.board?.design_settings?.rules?.min_track_width).toBe(0.25)
  expect(proJson.board?.design_settings?.rules?.min_copper_edge_clearance).toBe(
    0.3,
  )
  expect(proJson.net_settings?.classes?.[0]?.track_width).toBe(0.25)
  expect(proJson.head?.project_name).toBe("custom-board")
})

test("build --kicad-project exports explicit board design-rule limits into kicad_pro", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const circuitPath = path.join(tmpDir, "rules-board.tsx")
  await writeFile(
    circuitPath,
    `
export default () => (
  <board width="10mm" height="10mm" minTraceWidth={0.25} minBoardEdgeClearance={0.3}>
    <resistor resistance="1k" footprint="0402" name="R1" pcbX={0} pcbY={0} />
  </board>
)
`,
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ type: "module", dependencies: { react: "^19.1.0" } }),
  )

  await runCommand("tsci install")

  const { stderr } = await runCommand(
    `tsci build --kicad-project ${circuitPath}`,
  )
  expect(stderr).toBe("")

  const proPath = path.join(
    tmpDir,
    "dist",
    "rules-board",
    "kicad",
    "rules-board.kicad_pro",
  )
  expect(fs.existsSync(proPath)).toBe(true)

  const proJson = JSON.parse(fs.readFileSync(proPath, "utf-8"))
  expect(proJson.board?.design_settings?.rules).toBeDefined()
  expect(proJson.board.design_settings.rules.min_track_width).toBe(0.25)
  expect(proJson.board.design_settings.rules.min_copper_edge_clearance).toBe(
    0.3,
  )
  expect(proJson.net_settings?.classes?.[0]?.track_width).toBe(0.25)
}, 60_000)
