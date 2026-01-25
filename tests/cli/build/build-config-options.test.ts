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
const libraryCode = `
export const MyResistor = () => (
  <resistor resistance="1k" footprint="0402" name="R1" />
)
`

test("build uses config build.kicadLibrary setting", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await mkdir(path.join(tmpDir, "lib"), { recursive: true })
  await writeFile(path.join(tmpDir, "lib", "index.tsx"), libraryCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-kicad-library" }),
  )
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "./lib/index.tsx",
      build: {
        kicadLibrary: true,
      },
    }),
  )

  const { stderr, stdout } = await runCommand(`tsci build`)
  expect(stderr).toBe("")
  expect(stdout).toContain("Generating KiCad library")
  expect(stdout).toContain("kicad-library")

  const kicadLibDir = path.join(tmpDir, "dist", "kicad-library")
  expect((await stat(kicadLibDir)).isDirectory()).toBe(true)

  const files = await readdir(kicadLibDir, { recursive: true })
  const fileList = files.map((f) => f.toString())

  expect(fileList.some((f) => f.includes("symbols"))).toBe(true)
  expect(fileList.some((f) => f.includes("footprints"))).toBe(true)
}, 60_000)

test("build uses config build.kicadPcm setting", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await mkdir(path.join(tmpDir, "lib"), { recursive: true })
  await writeFile(path.join(tmpDir, "lib", "index.tsx"), libraryCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-kicad-library" }),
  )
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "./lib/index.tsx",
      build: {
        kicadPcm: true,
      },
    }),
  )

  const { stderr } = await runCommand(`tsci build`)

  const pcmDir = path.join(tmpDir, "dist", "pcm")
  const pcmDirStat = await stat(pcmDir)
  expect(pcmDirStat.isDirectory()).toBe(true)
}, 60_000)

test("build uses config build.previewImages setting", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "preview.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      build: {
        previewImages: true,
      },
    }),
  )

  await runCommand(`tsci build ${circuitPath}`)

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

test.todo(
  "build uses config build.typescriptLibrary setting for transpile",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const libDir = path.join(tmpDir, "lib")
    await mkdir(libDir, { recursive: true })
    const libPath = path.join(libDir, "index.ts")
    await writeFile(libPath, libraryCode)
    await writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test-transpile-lib",
        version: "1.0.0",
        main: "dist/index.js",
      }),
    )
    await writeFile(
      path.join(tmpDir, "tscircuit.config.json"),
      JSON.stringify({
        build: {
          typescriptLibrary: true,
        },
      }),
    )

    await runCommand(`tsci build`)

    const transpiledJs = await readFile(
      path.join(tmpDir, "dist", "index.js"),
      "utf-8",
    )
    expect(transpiledJs).toContain("MyResistor")
  },
  30_000,
)

test("CLI options override config build settings", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "override.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      build: {
        previewImages: false,
      },
    }),
  )

  const { stderr, stdout } = await runCommand(
    `tsci build ${circuitPath} --preview-images`,
  )
  expect(stderr).toBe("")

  expect(stdout).toContain("Generating preview images")

  const schematicSvgExists = await stat(
    path.join(tmpDir, "dist", "schematic.svg"),
  )
    .then(() => true)
    .catch(() => false)
  expect(schematicSvgExists).toBe(true)
}, 60_000)

test("build without config or CLI options does not generate optional outputs", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "plain.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${circuitPath}`)

  const circuitJson = await readFile(
    path.join(tmpDir, "dist", "plain", "circuit.json"),
    "utf-8",
  )
  expect(JSON.parse(circuitJson)).toBeTruthy()

  expect(stat(path.join(tmpDir, "dist", "schematic.svg"))).rejects.toBeTruthy()
  expect(stat(path.join(tmpDir, "dist", "plain", "kicad"))).rejects.toBeTruthy()
})

test("build with multiple config build options", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "multi.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      build: {
        kicadLibrary: true,
        previewImages: true,
      },
    }),
  )

  const { stderr } = await runCommand(`tsci build ${circuitPath}`)
  expect(stderr).toBe("")

  const kicadLibDir = path.join(tmpDir, "dist", "kicad-library")
  expect((await stat(kicadLibDir)).isDirectory()).toBe(true)

  const schematicSvgExists = await stat(
    path.join(tmpDir, "dist", "schematic.svg"),
  )
    .then(() => true)
    .catch(() => false)
  expect(schematicSvgExists).toBe(true)
}, 60_000)
