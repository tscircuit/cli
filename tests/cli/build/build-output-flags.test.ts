import { test, expect } from "bun:test"
import { readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build --pcb-svgs generates only pcb.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --pcb-svgs ${circuitPath}`)

  const pcbSvg = await readFile(path.join(tmpDir, "dist", "pcb.svg"), "utf-8")
  expect(pcbSvg).toContain("<svg")

  await expect(
    stat(path.join(tmpDir, "dist", "schematic.svg")),
  ).rejects.toBeTruthy()
  await expect(stat(path.join(tmpDir, "dist", "3d.png"))).rejects.toBeTruthy()
}, 30_000)

test("build --pngs generates only 3d.png", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --pngs ${circuitPath}`)

  const preview3d = await readFile(path.join(tmpDir, "dist", "3d.png"))
  expect(preview3d.byteLength).toBeGreaterThan(0)
  expect(preview3d[0]).toBe(0x89)
  expect(preview3d[1]).toBe(0x50)
  expect(preview3d[2]).toBe(0x4e)
  expect(preview3d[3]).toBe(0x47)

  await expect(stat(path.join(tmpDir, "dist", "pcb.svg"))).rejects.toBeTruthy()
  await expect(
    stat(path.join(tmpDir, "dist", "schematic.svg")),
  ).rejects.toBeTruthy()
}, 30_000)

test("build --svgs generates only pcb.svg and schematic.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --svgs ${circuitPath}`)

  const pcbSvg = await readFile(path.join(tmpDir, "dist", "pcb.svg"), "utf-8")
  expect(pcbSvg).toContain("<svg")

  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "schematic.svg"),
    "utf-8",
  )
  expect(schematicSvg).toContain("<svg")

  await expect(stat(path.join(tmpDir, "dist", "3d.png"))).rejects.toBeTruthy()
}, 30_000)

test("build --schematic-svgs generates only schematic.svg", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --schematic-svgs ${circuitPath}`)

  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "schematic.svg"),
    "utf-8",
  )
  expect(schematicSvg).toContain("<svg")

  await expect(stat(path.join(tmpDir, "dist", "pcb.svg"))).rejects.toBeTruthy()
  await expect(stat(path.join(tmpDir, "dist", "3d.png"))).rejects.toBeTruthy()
}, 30_000)

test("build established flags still work (--3d --pcb-only)", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --3d --pcb-only ${circuitPath}`)

  const pcbSvg = await readFile(path.join(tmpDir, "dist", "pcb.svg"), "utf-8")
  expect(pcbSvg).toContain("<svg")

  const preview3d = await readFile(path.join(tmpDir, "dist", "3d.png"))
  expect(preview3d.byteLength).toBeGreaterThan(0)
  expect(preview3d[0]).toBe(0x89)
  expect(preview3d[1]).toBe(0x50)
  expect(preview3d[2]).toBe(0x4e)
  expect(preview3d[3]).toBe(0x47)

  await expect(
    stat(path.join(tmpDir, "dist", "schematic.svg")),
  ).rejects.toBeTruthy()
}, 30_000)
