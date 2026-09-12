import { expect, test } from "bun:test"
import { generateKicadProject } from "cli/build/generate-kicad-project"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { Circuit } from "tscircuit"

test("generated KiCad projects preserve board limits in memory and on disk", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board
      width="10mm"
      height="10mm"
      minTraceWidth={0.25}
      minViaHoleDiameter={0.4}
      minViaPadDiameter={0.8}
    />,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  expect(
    circuitJson.find((element) => element.type === "pcb_board"),
  ).toMatchObject({
    min_trace_width: 0.25,
    min_via_hole_diameter: 0.4,
    min_via_pad_diameter: 0.8,
  })

  const dir = await mkdtemp(path.join(tmpdir(), "tsci-kicad-rules-"))
  try {
    for (const [inputName, expectedName] of [
      ["  limits  ", "limits"],
      ["   ", "project"],
    ]) {
      for (const writeFiles of [false, true]) {
        const outputDir = path.join(dir, `${expectedName}-${writeFiles}`)
        const result = await generateKicadProject({
          circuitJson,
          outputDir,
          projectName: inputName!,
          writeFiles,
        })
        const project = JSON.parse(result.proContent)
        expect(project.board?.design_settings?.rules).toMatchObject({
          min_track_width: 0.25,
          min_through_hole_diameter: 0.4,
          min_via_diameter: 0.8,
        })
        expect(result.projectName).toBe(expectedName)
        expect(project.head.project_name).toBe(expectedName)
        expect(project.board.last_opened_board).toBe(
          `${expectedName}.kicad_pcb`,
        )
        expect(project.schematic.last_opened_files).toEqual([
          `${expectedName}.kicad_sch`,
        ])
        expect(result.pcbContent).toContain("(kicad_pcb")
        expect(result.schContent).toContain("(kicad_sch")
        if (writeFiles) {
          for (const [extension, content] of [
            ["pro", result.proContent],
            ["pcb", result.pcbContent],
            ["sch", result.schContent],
          ]) {
            expect(
              await readFile(
                path.join(outputDir, `${expectedName}.kicad_${extension}`),
                "utf8",
              ),
            ).toBe(content)
          }
        } else {
          expect(existsSync(outputDir)).toBe(false)
        }
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
