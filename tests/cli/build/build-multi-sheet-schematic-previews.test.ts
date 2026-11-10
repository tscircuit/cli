import "bun-match-svg"
import { expect, test } from "bun:test"
import { readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  convertCircuitJsonToSchematicSvg,
  convertCircuitJsonToStackedSchematicSheetsSvg,
} from "circuit-to-svg"
import { EMPTY_IMAGE_FORMAT_SELECTION } from "cli/build/image-format-selection"
import { writeImageAssetsFromCircuitJson } from "cli/build/worker-output-generators"
import { convertSvgToPngBuffer } from "lib/shared/convert-svg-to-png"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const multiSheetCircuitCode = `
export default () => (
  <board width="20mm" height="10mm">
    <schematicsheet name="control" displayName="Control Sheet" sheetIndex={1} sheetWidth="60mm" sheetHeight="40mm" />
    <schematicsheet name="power" displayName="Power Sheet" sheetIndex={0} sheetWidth="60mm" sheetHeight="40mm" />
    <resistor name="R1" resistance="1k" footprint="0402" schSheetName="power" />
    <capacitor name="C1" capacitance="1uF" footprint="0402" schSheetName="control" />
  </board>
)`

const imageFormats = {
  ...EMPTY_IMAGE_FORMAT_SELECTION,
  schematicSvgs: true,
  schematicPngs: true,
}

for (const concurrency of [1, 2]) {
  test(`build previews render every schematic sheet (concurrency ${concurrency})`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await writeFile(path.join(tmpDir, "package.json"), "{}")
    await symlink(
      path.resolve("node_modules"),
      path.join(tmpDir, "node_modules"),
    )
    const source = path.join(tmpDir, "multiple-sheets.circuit.tsx")
    await writeFile(source, multiSheetCircuitCode)

    const result = await runCommand(
      `tsci build ${source} --schematic-svgs --schematic-png --disable-parts-engine --concurrency ${concurrency}`,
    )
    expect(result.exitCode, result.stderr).toBe(0)
    const outputDir = path.join(tmpDir, "dist", "multiple-sheets")
    const circuitJson = JSON.parse(
      await readFile(path.join(outputDir, "circuit.json"), "utf8"),
    )
    expect(
      circuitJson.filter((e: any) => e.type === "schematic_sheet"),
    ).toHaveLength(2)
    expect(
      circuitJson.filter((e: any) => e.type === "schematic_component"),
    ).toHaveLength(2)

    // CI builds generate images with a separate writer inside their workers.
    const workerDir = path.join(tmpDir, "worker-images")
    await writeImageAssetsFromCircuitJson(circuitJson, {
      outputDir: workerDir,
      imageFormats,
    })
    const expectedSvg =
      convertCircuitJsonToStackedSchematicSheetsSvg(circuitJson)
    const expectedPng = Buffer.from(convertSvgToPngBuffer(expectedSvg))
    for (const directory of [outputDir, workerDir]) {
      const svg = await readFile(path.join(directory, "schematic.svg"), "utf8")
      const png = await readFile(path.join(directory, "schematic.png"))
      expect(svg).toContain(">R1<")
      expect(svg).toContain(">C1<")
      expect(svg).toContain("Power Sheet")
      expect(svg).toContain("Control Sheet")
      expect(svg.indexOf("Power Sheet")).toBeLessThan(
        svg.indexOf("Control Sheet"),
      )
      expect(svg.match(/class="stacked-sheet-label"/g)).toHaveLength(2)
      expect(svg).toContain('class="tscircuit-stacked-schematic"')
      expect(svg).toBe(expectedSvg)
      expect(png.equals(expectedPng)).toBe(true)
      // PNG IHDR dimensions ensure the saved raster covers the whole SVG.
      expect(png.readUInt32BE(16)).toBe(1000)
      expect(png.readUInt32BE(20)).toBe(1406)
      await expect(svg).toMatchSvgSnapshot(
        import.meta.path,
        "build-multiple-sheets",
      )
    }
  }, 60_000)
}

for (const explicitSheet of [false, true]) {
  test(`single-sheet build previews preserve the existing renderer (explicit sheet: ${explicitSheet})`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await writeFile(path.join(tmpDir, "package.json"), "{}")
    await symlink(
      path.resolve("node_modules"),
      path.join(tmpDir, "node_modules"),
    )
    const source = path.join(tmpDir, "single.circuit.tsx")
    await writeFile(
      source,
      `
export default () => (
  <board width="10mm" height="10mm">
    ${explicitSheet ? '<schematicsheet name="power" displayName="Power Sheet" />' : ""}
    <resistor name="R1" resistance="1k" footprint="0402" ${explicitSheet ? 'schSheetName="power"' : ""} />
  </board>
)`,
    )
    const result = await runCommand(
      `tsci build ${source} --schematic-svgs --schematic-png --disable-parts-engine`,
    )
    expect(result.exitCode, result.stderr).toBe(0)
    const outputDir = path.join(tmpDir, "dist", "single")
    const circuitJson = JSON.parse(
      await readFile(path.join(outputDir, "circuit.json"), "utf8"),
    )
    const workerDir = path.join(tmpDir, "worker-images")
    await writeImageAssetsFromCircuitJson(circuitJson, {
      outputDir: workerDir,
      imageFormats,
    })
    const expectedSvg = convertCircuitJsonToSchematicSvg(circuitJson)
    const expectedPng = Buffer.from(convertSvgToPngBuffer(expectedSvg))
    for (const directory of [outputDir, workerDir]) {
      expect(
        await readFile(path.join(directory, "schematic.svg"), "utf8"),
      ).toBe(expectedSvg)
      expect(
        (await readFile(path.join(directory, "schematic.png"))).equals(
          expectedPng,
        ),
      ).toBe(true)
    }
  }, 60_000)
}
