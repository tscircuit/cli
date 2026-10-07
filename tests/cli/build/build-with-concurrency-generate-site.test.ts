import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { readFile, writeFile, stat, symlink } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build with --ci generates index.html and circuit.json", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "index.tsx")
  await writeFile(circuitPath, circuitCode)

  await runCommand(`tsci install`)
  await runCommand(`tsci build --ci --concurrency 4`)

  const circuitJsonPath = path.join(tmpDir, "dist", "index", "circuit.json")
  expect(await stat(circuitJsonPath).then((stats) => stats.isFile())).toBe(true)
  const indexHtmlPath = path.join(tmpDir, "dist", "index.html")
  expect(await stat(indexHtmlPath).then((stats) => stats.isFile())).toBe(true)
  const schematicSvgPath = path.join(tmpDir, "dist", "index", "schematic.svg")
  expect(await stat(schematicSvgPath).then((stats) => stats.isFile())).toBe(
    true,
  )
  const pcbSvgPath = path.join(tmpDir, "dist", "index", "pcb.svg")
  expect(await stat(pcbSvgPath).then((stats) => stats.isFile())).toBe(true)
}, 30_000)

test("build --pngs --ci --concurrency 2 writes only 3d.png for selected build", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "index.tsx")
  await writeFile(circuitPath, circuitCode)

  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await symlink(path.resolve("node_modules"), path.join(tmpDir, "node_modules"))
  await runCommand(`tsci build --ci --concurrency 2 --pngs`)

  const pngPath = path.join(tmpDir, "dist", "index", "3d.png")
  const pcbSvgPath = path.join(tmpDir, "dist", "index", "pcb.svg")
  const schematicSvgPath = path.join(tmpDir, "dist", "index", "schematic.svg")

  expect(await stat(pngPath).then((stats) => stats.isFile())).toBe(true)
  const png = await readFile(pngPath)
  expect(png.readUInt32BE(16)).toBe(480)
  expect(png.readUInt32BE(20)).toBe(320)
  await expect(stat(pcbSvgPath)).rejects.toBeTruthy()
  await expect(stat(schematicSvgPath)).rejects.toBeTruthy()
}, 60_000)
