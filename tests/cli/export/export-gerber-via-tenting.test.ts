import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("Gerber export preserves board via tenting and its drill", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "tenting.circuit.json")
  const outputPath = path.join(tmpDir, "tenting.zip")
  await writeFile(
    circuitPath,
    JSON.stringify([
      {
        type: "pcb_board",
        pcb_board_id: "board",
        center: { x: 0, y: 0 },
        width: 12,
        height: 8,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
        default_via_tented_on_top: true,
        default_via_tented_on_bottom: false,
      },
      {
        type: "pcb_via",
        pcb_via_id: "via",
        pcb_board_id: "board",
        x: 2,
        y: 0,
        outer_diameter: 1.2,
        hole_diameter: 0.5,
        layers: ["top", "bottom"],
      },
    ]),
  )

  const { exitCode } = await runCommand(
    `tsci export ${circuitPath} --format gerbers --output ${outputPath}`,
  )
  expect(exitCode).toBe(0)
  const zip = await JSZip.loadAsync(await readFile(outputPath))
  const viaFlash = "X002000000Y000000000D03*"
  expect(await zip.file("F_Mask.gbr")!.async("string")).not.toContain(viaFlash)
  expect(await zip.file("B_Mask.gbr")!.async("string")).toContain(viaFlash)
  expect(await zip.file("F_Cu.gbr")!.async("string")).toContain(viaFlash)
  expect(await zip.file("B_Cu.gbr")!.async("string")).toContain(viaFlash)
  expect(await zip.file("drill-L1-L2.drl")!.async("string")).toContain(
    "X2.0000Y0.0000",
  )
})
