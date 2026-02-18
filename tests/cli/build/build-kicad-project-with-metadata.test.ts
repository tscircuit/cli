import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readdir, readFile } from "node:fs/promises"
import path from "node:path"

test("build --kicad-project extracts and applies footprint metadata", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const componentCode = `
const CustomChip = (props: { name: string }) => (
  <chip
    name={props.name}
    footprint="soic8"
    kicadFootprintMetadata={{
      footprintName: "CustomSOIC8",
      properties: {
        Reference: {
          value: "U",
          at: { x: 0, y: -4 },
          layer: "F.SilkS",
          effects: {
            font: { size: { x: 0.8, y: 0.8 }, thickness: 0.12 },
          },
        },
      },
      model: {
        path: "\${KIPRJMOD}/3dmodels/chip.step",
        offset: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        rotate: { x: 0, y: 0, z: 0 },
      },
    }}
  />
)

export default () => (
  <board width="20mm" height="20mm">
    <CustomChip name="U1" />
    <CustomChip name="U2" />
  </board>
)
`

  await writeFile(path.join(tmpDir, "board.tsx"), componentCode)

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-kicad-metadata",
      version: "1.0.0",
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await runCommand("tsci install")

  const { stdout } = await runCommand("tsci build board.tsx --kicad-project")

  // Should log that metadata was found
  expect(stdout).toContain("Found 1 footprint metadata")

  // Check the generated kicad_pcb file
  const kicadDir = path.join(tmpDir, "dist", "board", "kicad")
  const files = await readdir(kicadDir)
  const pcbFile = files.find((f) => f.endsWith(".kicad_pcb"))!
  const pcbContent = await readFile(path.join(kicadDir, pcbFile), "utf-8")

  // Verify footprintName from metadata is applied
  expect(pcbContent).toContain("CustomSOIC8")

  // Verify model path from metadata is applied
  expect(pcbContent).toContain("${KIPRJMOD}/3dmodels/chip.step")

  // Verify both U1 and U2 components exist with correct RefDes from circuit-json
  expect(pcbContent).toMatch(/Reference.*U1/s)
  expect(pcbContent).toMatch(/Reference.*U2/s)
}, 120_000)
