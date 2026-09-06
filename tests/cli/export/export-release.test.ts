import { expect, test } from "bun:test"
import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const releaseFiles = [
  "circuit.json",
  "schematic.svg",
  "pcb.svg",
  "gerbers.zip",
].sort()

test(
  "release builds once and exports circuit JSON, SVGs, and Gerbers",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "board.tsx")
    const outputDir = path.join(tmpDir, "dist", "release")
    await writeFile(
      circuitPath,
      `
    import { appendFileSync } from "node:fs"
    export default () => {
      appendFileSync(${JSON.stringify(path.join(tmpDir, "builds.txt"))}, "build\\n")
      return <board width="10mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
    }
  `,
    )

    const result = await runCommand(
      `tsci export ${circuitPath} --release --output dist/release --disable-parts-engine`,
    )
    expect(result.exitCode).toBe(0)
    expect(await readFile(path.join(tmpDir, "builds.txt"), "utf8")).toBe(
      "build\n",
    )
    expect((await readdir(outputDir)).sort()).toEqual(releaseFiles)
    for (const fileName of ["schematic.svg", "pcb.svg"]) {
      expect(await readFile(path.join(outputDir, fileName), "utf8")).toContain(
        "<svg",
      )
    }
    const zip = await JSZip.loadAsync(
      await readFile(path.join(outputDir, "gerbers.zip")),
    )
    expect(await zip.file("bom.csv")!.async("string")).toContain("R1")
    expect(await zip.file("pick_and_place.csv")!.async("string")).toContain(
      "R1",
    )
    expect(
      JSON.parse(await readFile(path.join(outputDir, "circuit.json"), "utf8")),
    ).toBeArray()
  },
  { timeout: 60_000 },
)

test("release rejects conflicting formats and unwritable destinations", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  for (const format of ["json", "spice", "gerbers"]) {
    const conflict = await runCommand(
      `tsci export missing.tsx --release --format ${format}`,
    )
    expect(conflict.exitCode).not.toBe(0)
    expect(conflict.stderr).toContain(
      "--release cannot be combined with --format",
    )
  }
  const circuitPath = path.join(tmpDir, "board.circuit.json")
  await writeFile(circuitPath, "[]")
  const outputPath = path.join(tmpDir, "existing-file")
  await writeFile(outputPath, "keep me")
  expect(
    (
      await runCommand(
        `tsci export ${circuitPath} --release --output ${outputPath}`,
      )
    ).exitCode,
  ).not.toBe(0)
  expect(await readFile(outputPath, "utf8")).toBe("keep me")
})
