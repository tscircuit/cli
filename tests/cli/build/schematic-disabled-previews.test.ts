import { test, expect } from "bun:test"
import { existsSync } from "node:fs"
import { readFile, writeFile, symlink } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { writeImageAssetsFromCircuitJson } from "cli/build/worker-output-generators"
import { EMPTY_IMAGE_FORMAT_SELECTION } from "cli/build/image-format-selection"

for (const concurrency of [1, 2]) {
  test(`schematicDisabled omits SVG/PNG previews and removes stale snapshots (concurrency ${concurrency})`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "index.tsx")
    const code = (disabled: boolean) => `
export default () => (
  <board width="10mm" height="10mm" schematicDisabled={${disabled}}>
    <resistor name="R1" resistance="1k" footprint="0402" />
  </board>
)`
    await writeFile(path.join(tmpDir, "package.json"), "{}")
    await symlink(
      path.resolve("node_modules"),
      path.join(tmpDir, "node_modules"),
    )
    await writeFile(circuitPath, code(false))
    const command = `tsci build ${circuitPath} --pcb-svgs --schematic-svgs --schematic-png --disable-parts-engine --concurrency ${concurrency}`
    expect((await runCommand(command)).exitCode).toBe(0)
    const outputDir = path.join(tmpDir, "dist", "index")
    const imageFormats = {
      ...EMPTY_IMAGE_FORMAT_SELECTION,
      pcbSvgs: true,
      schematicSvgs: true,
      schematicPngs: true,
    }
    if (concurrency === 2) {
      await writeImageAssetsFromCircuitJson(
        JSON.parse(
          await readFile(path.join(outputDir, "circuit.json"), "utf-8"),
        ),
        { outputDir, imageFormats },
      )
    }
    expect(existsSync(path.join(outputDir, "schematic.svg"))).toBe(true)
    expect(existsSync(path.join(outputDir, "schematic.png"))).toBe(true)

    await writeFile(circuitPath, code(true))
    expect((await runCommand(command)).exitCode).toBe(0)
    const circuitJson = JSON.parse(
      await readFile(path.join(outputDir, "circuit.json"), "utf-8"),
    )
    expect(
      circuitJson.some((element: any) => element.type.startsWith("schematic_")),
    ).toBe(false)
    expect(existsSync(path.join(outputDir, "schematic.svg"))).toBe(false)
    expect(existsSync(path.join(outputDir, "schematic.png"))).toBe(false)
    expect(existsSync(path.join(outputDir, "pcb.svg"))).toBe(true)
    if (concurrency === 2) {
      // The CI worker has a separate exporter; it must also clear old previews.
      await writeFile(path.join(outputDir, "schematic.svg"), "stale snapshot")
      await writeFile(path.join(outputDir, "schematic.png"), "stale snapshot")
      await writeImageAssetsFromCircuitJson(circuitJson, {
        outputDir,
        imageFormats,
      })
      expect(existsSync(path.join(outputDir, "schematic.svg"))).toBe(false)
      expect(existsSync(path.join(outputDir, "schematic.png"))).toBe(false)
      expect(existsSync(path.join(outputDir, "pcb.svg"))).toBe(true)
    }
  }, 60_000)
}
