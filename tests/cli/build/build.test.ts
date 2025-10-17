import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat, mkdir } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

// When a file is provided only that file should be built

test("build with file only outputs that file", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  const extraCircuitPath = path.join(tmpDir, "extra.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(extraCircuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${circuitPath}`)

  const data = await readFile(
    path.join(tmpDir, "dist", "test-circuit", "circuit.json"),
    "utf-8",
  )
  const json = JSON.parse(data)
  const component = json.find((c: any) => c.type === "source_component")
  expect(component.name).toBe("R1")

  await expect(
    stat(path.join(tmpDir, "dist", "extra", "circuit.json")),
  ).rejects.toBeTruthy()
}, 30_000)

// When no file is provided search for *.circuit.tsx and *.board.tsx files

test("build without file builds circuit and board files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const mainPath = path.join(tmpDir, "index.tsx") // should be ignored
  const circuitPath = path.join(tmpDir, "extra.circuit.tsx")
  const boardPath = path.join(tmpDir, "my.board.tsx")
  await writeFile(mainPath, circuitCode)
  await writeFile(circuitPath, circuitCode)
  await writeFile(boardPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build`)

  // index.tsx should not be built
  await expect(
    stat(path.join(tmpDir, "dist", "index", "circuit.json")),
  ).rejects.toBeTruthy()
  await expect(
    stat(path.join(tmpDir, "dist", "circuit.json")),
  ).rejects.toBeTruthy()

  const extraData = await readFile(
    path.join(tmpDir, "dist", "extra", "circuit.json"),
    "utf-8",
  )
  const extraJson = JSON.parse(extraData)
  const extraComponent = extraJson.find(
    (c: any) => c.type === "source_component",
  )
  expect(extraComponent.name).toBe("R1")

  const boardData = await readFile(
    path.join(tmpDir, "dist", "my", "circuit.json"),
    "utf-8",
  )
  const boardJson = JSON.parse(boardData)
  const boardComponent = boardJson.find(
    (c: any) => c.type === "source_component",
  )
  expect(boardComponent.name).toBe("R1")
}, 30_000)

test("build respects includeBoardFiles config globs", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const boardsDir = path.join(tmpDir, "boards")
  await mkdir(boardsDir, { recursive: true })
  const includedBoard = path.join(boardsDir, "selected.board.tsx")
  const anotherIncludedBoard = path.join(boardsDir, "anotherboard.board.tsx")
  const excludedBoard = path.join(tmpDir, "ignored.board.tsx")

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["boards/**/*.board.tsx"] }),
  )
  await writeFile(includedBoard, circuitCode)
  await writeFile(anotherIncludedBoard, circuitCode)
  await writeFile(excludedBoard, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand("tsci build")

  const includedOutput = await readFile(
    path.join(tmpDir, "dist", "boards", "selected", "circuit.json"),
    "utf-8",
  )
  const includedJson = JSON.parse(includedOutput)
  const includedComponent = includedJson.find(
    (c: any) => c.type === "source_component",
  )
  expect(includedComponent.name).toBe("R1")

  await expect(
    stat(path.join(tmpDir, "dist", "boards", "anotherboard", "circuit.json")),
  ).resolves.toBeTruthy()

  await expect(
    stat(path.join(tmpDir, "dist", "ignored", "circuit.json")),
  ).rejects.toBeTruthy()
}, 30_000)

test("build without circuit files falls back to main entrypoint", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const mainPath = path.join(tmpDir, "index.tsx")
  await writeFile(mainPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build`)

  const data = await readFile(
    path.join(tmpDir, "dist", "index", "circuit.json"),
    "utf-8",
  )
  const json = JSON.parse(data)
  const component = json.find((c: any) => c.type === "source_component")
  expect(component.name).toBe("R1")
}, 30_000)

test("build with --preview-images generates preview assets", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --preview-images ${circuitPath}`)

  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "schematic.svg"),
    "utf-8",
  )
  const pcbSvg = await readFile(path.join(tmpDir, "dist", "pcb.svg"), "utf-8")
  const preview3d = await readFile(path.join(tmpDir, "dist", "3d.png"))

  expect(schematicSvg).toContain("<svg")
  expect(pcbSvg).toContain("<svg")
  expect(preview3d.byteLength).toBeGreaterThan(0)
  expect(preview3d[0]).toBe(0x89)
  expect(preview3d[1]).toBe(0x50)
  expect(preview3d[2]).toBe(0x4e)
  expect(preview3d[3]).toBe(0x47)
}, 30_000)

test("build with --all-images generates preview assets for each build", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const firstCircuit = path.join(tmpDir, "first.circuit.tsx")
  const secondCircuit = path.join(tmpDir, "second.circuit.tsx")
  await writeFile(firstCircuit, circuitCode)
  await writeFile(secondCircuit, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build --all-images`)

  const readImageSet = async (name: string) => {
    const base = path.join(tmpDir, "dist", name)
    const schematicSvg = await readFile(
      path.join(base, "schematic.svg"),
      "utf-8",
    )
    const pcbSvg = await readFile(path.join(base, "pcb.svg"), "utf-8")
    const preview3d = await readFile(path.join(base, "3d.png"))

    expect(schematicSvg).toContain("<svg")
    expect(pcbSvg).toContain("<svg")
    expect(preview3d.byteLength).toBeGreaterThan(0)
    expect(preview3d[0]).toBe(0x89)
    expect(preview3d[1]).toBe(0x50)
    expect(preview3d[2]).toBe(0x4e)
    expect(preview3d[3]).toBe(0x47)
  }

  await readImageSet("first")
  await readImageSet("second")
}, 60_000)
