import { expect, test } from "bun:test"
import { copyFile, readFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("Gerber ZIP includes registered stiffener drawings for a flex jumper", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "flex-jumper.circuit.json")
  const outputPath = path.join(tmpDir, "flex-jumper-gerbers.zip")
  await copyFile(
    path.resolve(
      import.meta.dir,
      "../../fixtures/export/flex-jumper-stiffeners.circuit.json",
    ),
    circuitPath,
  )

  const { exitCode, stderr } = await runCommand(
    `tsci export ${circuitPath} --format gerbers --output ${outputPath}`,
  )
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")

  const zip = await JSZip.loadAsync(await readFile(outputPath))
  expect(Object.keys(zip.files)).toEqual(
    expect.arrayContaining([
      "F_Cu.gbr",
      "Edge_Cuts.gbr",
      "B_Stiffener_polyimide.gbr",
      "B_Stiffener_fr4.gbr",
      "bom.csv",
      "pick_and_place.csv",
    ]),
  )

  // The translated board uses negative world Y. Both bottom drawings stay in
  // the same top-view coordinate system as the copper and board outline.
  const polyimide = await zip.file("B_Stiffener_polyimide.gbr")!.async("string")
  expect(polyimide).toContain("%TF.FileFunction,Other,Stiffener,Bot*%")
  expect(polyimide).toContain(
    "Stiffener thickness: 0.2 mm; adhesive thickness: 0.05 mm",
  )
  expect(polyimide.match(/^X.*D0[12]\*$/gm)).toEqual([
    "X010500000Y-04500000D02*",
    "X019500000Y-04500000D01*",
    "X019500000Y-15500000D01*",
    "X010500000Y-15500000D01*",
    "X010500000Y-04500000D01*",
  ])

  const fr4 = await zip.file("B_Stiffener_fr4.gbr")!.async("string")
  expect(fr4).toContain(
    "Stiffener thickness: 0.4 mm; adhesive thickness: 0.05 mm",
  )
  const fr4Outline = fr4.match(/^X.*D0[12]\*$/gm)!
  expect(fr4Outline).toHaveLength(9)
  expect(fr4Outline[0]).toBe("X041300000Y-15500000D02*")
  expect(fr4Outline[2]).toBe("X049500000Y-14700000D01*")
  expect(fr4Outline[8]).toBe("X041300000Y-15500000D01*")

  const copper = await zip.file("F_Cu.gbr")!.async("string")
  expect(copper).toContain("X012750000Y-12500000D03*")
  expect(copper).toContain("X047000000Y-12500000D01*")
  const board = await zip.file("Edge_Cuts.gbr")!.async("string")
  expect(board).toContain("X010000000Y-16000000D02*")
})
