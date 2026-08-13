import { expect, test } from "bun:test"
import { copyFile, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const fixturePath = path.resolve(
  import.meta.dir,
  "../../fixtures/export/output-path-board.circuit.json",
)

const setupExportFixture = async () => {
  const fixture = await getCliTestFixture()
  const projectDir = path.join(fixture.tmpDir, "project")
  const circuitPath = path.join(projectDir, "board.circuit.json")
  await mkdir(projectDir, { recursive: true })
  await copyFile(fixturePath, circuitPath)
  return { ...fixture, projectDir, circuitPath }
}

test("export preserves an absolute POSIX GLB output path", async () => {
  const { tmpDir, circuitPath, runCommand } = await setupExportFixture()
  const outputPath = path.join(tmpDir, "absolute-board.glb")

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci export ${circuitPath} --format glb --output ${outputPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(path.posix.isAbsolute(outputPath)).toBe(true)
  expect((await readFile(outputPath)).subarray(0, 4).toString()).toBe("glTF")
  expect(stdout.trim()).toBe(`Exported to ${outputPath}!`)
})

test("export resolves a relative Circuit JSON output path from the input directory", async () => {
  const { projectDir, circuitPath, runCommand } = await setupExportFixture()
  const relativeOutputPath = "exports/relative-board.circuit.json"
  const outputPath = path.join(projectDir, relativeOutputPath)
  await mkdir(path.dirname(outputPath), { recursive: true })

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci export ${circuitPath} --format circuit-json --output ${relativeOutputPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(JSON.parse(await readFile(outputPath, "utf8"))).toEqual(
    JSON.parse(await readFile(fixturePath, "utf8")),
  )
  expect(stdout.trim()).toBe(`Exported to ${outputPath}!`)
})

test("export resolves an output filename from the input directory", async () => {
  const { projectDir, circuitPath, runCommand } = await setupExportFixture()
  const outputFileName = "named-board.glb"
  const outputPath = path.join(projectDir, outputFileName)

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci export ${circuitPath} --format glb --output ${outputFileName}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect((await readFile(outputPath)).subarray(0, 4).toString()).toBe("glTF")
  expect(stdout.trim()).toBe(`Exported to ${outputPath}!`)
})
