import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat, mkdir, readdir } from "node:fs/promises"
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

test("build with directory argument respects includeBoardFiles", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const srcDir = path.join(tmpDir, "src")
  const otherDir = path.join(tmpDir, "other")
  await mkdir(srcDir, { recursive: true })
  await mkdir(otherDir, { recursive: true })

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      includeBoardFiles: ["src/**/*.board.tsx", "other/**/*.board.tsx"],
    }),
  )

  const srcBoard = path.join(srcDir, "inside-src.board.tsx")
  const otherBoard = path.join(otherDir, "inside-other.board.tsx")
  await writeFile(srcBoard, circuitCode)
  await writeFile(otherBoard, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${path.relative(tmpDir, srcDir)}`)

  const srcData = await readFile(
    path.join(tmpDir, "dist", "src", "inside-src", "circuit.json"),
    "utf-8",
  )
  const srcJson = JSON.parse(srcData)
  const srcComponent = srcJson.find((c: any) => c.type === "source_component")
  expect(srcComponent.name).toBe("R1")

  await expect(
    stat(path.join(tmpDir, "dist", "other", "inside-other", "circuit.json")),
  ).rejects.toBeTruthy()
}, 30_000)

test("build with directory argument errors when no files match", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const srcDir = path.join(tmpDir, "src")
  await mkdir(srcDir, { recursive: true })

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["src/**/*.board.tsx"] }),
  )

  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr } = await runCommand(
    `tsci build ${path.relative(tmpDir, srcDir)}`,
  )

  expect(stderr).toContain(
    'There were no files to build found matching the includeBoardFiles globs: ["src/**/*.board.tsx"]',
  )
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

test("build with --kicad generates KiCad project files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "kicad-board.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr } = await runCommand(`tsci build --kicad ${circuitPath}`)
  expect(stderr).toBe("")

  const projectDir = path.join(tmpDir, "dist", "kicad-board", "kicad")
  const schContent = await readFile(
    path.join(projectDir, "kicad-board.kicad_sch"),
    "utf-8",
  )
  const pcbContent = await readFile(
    path.join(projectDir, "kicad-board.kicad_pcb"),
    "utf-8",
  )
  const proContent = await readFile(
    path.join(projectDir, "kicad-board.kicad_pro"),
    "utf-8",
  )

  expect(schContent).toContain("kicad_sch")
  expect(pcbContent).toContain("kicad_pcb")
  expect(proContent).toContain("kicad-board.kicad_pcb")
}, 60_000)

const circuitCodeWithGlbCadModel = `
import cadModelUrl from "./chip.glb"

export default () => (
  <board width="10mm" height="10mm">
    <chip
      name="U1"
      footprint="soic8"
      cadModel={<cadmodel modelUrl={cadModelUrl} />}
    />
  </board>
)`

test("build with --preview-images generates preview assets with GLB cad_model", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "glb-preview.circuit.tsx")

  // Copy a real GLB file from the examples directory
  const sourceGlbPath = path.join(
    process.cwd(),
    "examples/glb-loading/soic8.glb",
  )
  const glbContent = await readFile(sourceGlbPath)
  const glbPath = path.join(tmpDir, "chip.glb")

  await writeFile(circuitPath, circuitCodeWithGlbCadModel)
  await writeFile(glbPath, glbContent)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await runCommand("tsci install")

  const { stdout, stderr } = await runCommand(
    `tsci build --preview-images ${circuitPath}`,
  )

  // The error "TypeError: fetch() URL is invalid" should not appear
  expect(stderr).not.toContain("fetch() URL is invalid")
  expect(stderr).not.toContain("ERR_INVALID_URL")

  // Preview images should be generated successfully
  const schematicSvg = await readFile(
    path.join(tmpDir, "dist", "schematic.svg"),
    "utf-8",
  )
  const pcbSvg = await readFile(path.join(tmpDir, "dist", "pcb.svg"), "utf-8")
  const preview3d = await readFile(path.join(tmpDir, "dist", "3d.png"))

  expect(schematicSvg).toContain("<svg")
  expect(pcbSvg).toContain("<svg")
  expect(preview3d.byteLength).toBeGreaterThan(0)
  // PNG magic bytes
  expect(preview3d[0]).toBe(0x89)
  expect(preview3d[1]).toBe(0x50)
  expect(preview3d[2]).toBe(0x4e)
  expect(preview3d[3]).toBe(0x47)
}, 60_000)
