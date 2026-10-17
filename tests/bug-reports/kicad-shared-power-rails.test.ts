import { expect, test } from "bun:test"
import { copyFile, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { parseKicadSch } from "kicadts"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"

test("kicad_zip exports repeated rails as global power symbols", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await copyFile(
    path.join(
      import.meta.dir,
      "../fixtures/assets/kicad-shared-power-rails/index.tsx",
    ),
    path.join(tmpDir, "index.tsx"),
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  const result = await runCommand("tsci export index.tsx -f kicad_zip")
  expect(result.exitCode).toBe(0)
  const zip = await JSZip.loadAsync(
    await readFile(path.join(tmpDir, "index-kicad.zip")),
  )
  const schematicFile = zip.file("index.kicad_sch")
  expect(schematicFile).not.toBeNull()
  const schematic = parseKicadSch(await schematicFile!.async("string"))
  const rails = schematic.symbols.filter((symbol) =>
    symbol.properties.some(
      (property) =>
        property.key === "Reference" && property.value.startsWith("#PWR"),
    ),
  )
  expect(rails).toHaveLength(4)
  const references = rails.map(
    (symbol) => symbol.properties.find((p) => p.key === "Reference")!.value,
  )
  expect(new Set(references).size).toBe(4)
  expect(
    rails
      .map((symbol) => symbol.properties.find((p) => p.key === "Value")!.value)
      .sort(),
  ).toEqual(["GND", "GND", "VDD", "VDD"])
  for (const rail of rails) {
    expect(rail.inBom).toBe(false)
    expect(rail.onBoard).toBe(false)
  }
  const libraryRails = schematic.libSymbols!.symbols.filter((symbol) =>
    symbol.libraryId?.startsWith("Custom:rail_"),
  )
  expect(libraryRails).toHaveLength(2)
  for (const symbol of libraryRails) {
    expect(symbol.getString()).toContain("(power global)")
    expect(
      symbol.subSymbols
        .flatMap((unit) => unit.pins)
        .map((pin) => pin.pinElectricalType),
    ).toEqual(["power_in"])
  }
  expect(
    schematic.symbols
      .filter((symbol) => !rails.includes(symbol))
      .map(
        (symbol) => symbol.properties.find((p) => p.key === "Reference")!.value,
      )
      .sort(),
  ).toEqual(["C1", "C2"])
}, 60_000)
