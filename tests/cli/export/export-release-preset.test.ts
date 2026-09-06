import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const releaseFiles = [
  "circuit.json",
  "schematic.svg",
  "pcb.svg",
  "assembly.svg",
  "board.glb",
  "gerbers.zip",
  "bom.csv",
  "pick-and-place.csv",
  "checks.json",
  "release-manifest.json",
].sort()

test(
  "release builds once and packages verifiable artifacts from the same circuit JSON",
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
      `tsci export ${circuitPath} --preset release --output dist/release --disable-parts-engine`,
    )
    expect(result.exitCode).toBe(0)
    expect(await readFile(path.join(tmpDir, "builds.txt"), "utf8")).toBe(
      "build\n",
    )
    expect((await readdir(outputDir)).sort()).toEqual(releaseFiles)
    for (const fileName of ["schematic.svg", "pcb.svg", "assembly.svg"]) {
      expect(await readFile(path.join(outputDir, fileName), "utf8")).toContain(
        "<svg",
      )
    }
    expect(
      (await readFile(path.join(outputDir, "board.glb")))
        .subarray(0, 4)
        .toString(),
    ).toBe("glTF")

    const zip = await JSZip.loadAsync(
      await readFile(path.join(outputDir, "gerbers.zip")),
    )
    expect(await zip.file("bom.csv")!.async("string")).toBe(
      await readFile(path.join(outputDir, "bom.csv"), "utf8"),
    )
    expect(await zip.file("pick_and_place.csv")!.async("string")).toBe(
      await readFile(path.join(outputDir, "pick-and-place.csv"), "utf8"),
    )
    expect(await readFile(path.join(outputDir, "bom.csv"), "utf8")).toContain(
      "R1",
    )
    const manifest = JSON.parse(
      await readFile(path.join(outputDir, "release-manifest.json"), "utf8"),
    )
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.preset).toBe("release")
    expect(
      manifest.files.map((file: { path: string }) => file.path).sort(),
    ).toEqual(releaseFiles.filter((file) => file !== "release-manifest.json"))
    for (const file of manifest.files) {
      const content = await readFile(path.join(outputDir, file.path))
      expect(file.bytes).toBe(content.byteLength)
      expect(file.sha256).toBe(
        createHash("sha256").update(content).digest("hex"),
      )
    }

    const secondOutputDir = path.join(tmpDir, "repeated-release")
    const repeat = await runCommand(
      `tsci export ${path.join(outputDir, "circuit.json")} --preset release --output ${secondOutputDir}`,
    )
    expect(repeat.exitCode).toBe(0)
    for (const fileName of releaseFiles) {
      // The Gerber converter embeds wall-clock dates in its file contents.
      if (fileName === "gerbers.zip" || fileName === "release-manifest.json")
        continue
      expect(await readFile(path.join(secondOutputDir, fileName))).toEqual(
        await readFile(path.join(outputDir, fileName)),
      )
    }
  },
  { timeout: 60_000 },
)

test("release includes build errors and warnings and defaults to dist/release", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const projectDir = path.join(tmpDir, "project")
  await mkdir(projectDir)
  const circuitPath = path.join(projectDir, "board.circuit.json")
  const board = JSON.parse(
    await readFile(
      path.resolve(
        import.meta.dir,
        "../../fixtures/export/output-path-board.circuit.json",
      ),
      "utf8",
    ),
  )
  const error = {
    type: "pcb_trace_error",
    error_type: "pcb_trace_error",
    pcb_trace_error_id: "error_1",
    message: "Unrouted trace",
  }
  const warning = {
    type: "source_pin_missing_trace_warning",
    warning_type: "source_pin_missing_trace_warning",
    source_pin_missing_trace_warning_id: "warning_1",
    message: "Missing trace",
    source_port_id: "port_1",
  }
  await writeFile(circuitPath, JSON.stringify([...board, error, warning]))
  const result = await runCommand(`tsci export ${circuitPath} --preset release`)
  expect(result.exitCode).toBe(0)
  const outputDir = path.join(projectDir, "dist", "release")
  expect(
    JSON.parse(await readFile(path.join(outputDir, "checks.json"), "utf8")),
  ).toEqual({ errors: [error], warnings: [warning] })
})

test("release rejects unknown presets, conflicting formats, and unwritable destinations", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  expect(
    (await runCommand("tsci export missing.tsx --preset unknown")).exitCode,
  ).not.toBe(0)
  for (const format of ["json", "spice", "gerbers"]) {
    const conflict = await runCommand(
      `tsci export missing.tsx --preset release --format ${format}`,
    )
    expect(conflict.exitCode).not.toBe(0)
    expect(conflict.stderr).toContain("cannot be used with option")
  }
  const circuitPath = path.join(tmpDir, "board.circuit.json")
  await writeFile(circuitPath, "[]")
  const outputPath = path.join(tmpDir, "existing-file")
  await writeFile(outputPath, "keep me")
  expect(
    (
      await runCommand(
        `tsci export ${circuitPath} --preset release --output ${outputPath}`,
      )
    ).exitCode,
  ).not.toBe(0)
  expect(await readFile(outputPath, "utf8")).toBe("keep me")
})

test("a failed release write removes the previous completion manifest", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "board.circuit.json")
  await writeFile(
    circuitPath,
    await readFile(
      path.resolve(
        import.meta.dir,
        "../../fixtures/export/output-path-board.circuit.json",
      ),
    ),
  )
  const outputDir = path.join(tmpDir, "release")
  await mkdir(path.join(outputDir, "circuit.json"), { recursive: true })
  await writeFile(path.join(outputDir, "release-manifest.json"), "old manifest")
  const result = await runCommand(
    `tsci export ${circuitPath} --preset release --output ${outputDir}`,
  )
  expect(result.exitCode).not.toBe(0)
  expect(result.stdout).not.toContain("Exported to")
  expect(await readdir(outputDir)).not.toContain("release-manifest.json")
})
