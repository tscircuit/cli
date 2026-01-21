import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readdir, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"
import JSZip from "jszip"

test("build --kicad-pcm generates KiCad PCM assets", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await mkdir(path.join(tmpDir, "lib"), { recursive: true })

  const componentCode = `
export const MyResistor = () => (
  <resistor resistance="1k" footprint="0402" name="R1" />
)
`

  await writeFile(path.join(tmpDir, "lib", "index.tsx"), componentCode)

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "./lib/index.tsx",
    }),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "@tsci/testuser.my-resistor",
      version: "1.0.0",
      description: "A test resistor component",
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await runCommand("tsci install")

  const { stdout } = await runCommand("tsci build --kicad-pcm")

  expect(stdout).toContain("Generating KiCad PCM assets")
  expect(stdout).toContain("KiCad PCM assets generated")

  // Check PCM files exist
  const pcmDir = path.join(tmpDir, "dist", "pcm")
  expect(fs.existsSync(pcmDir)).toBe(true)
  expect(fs.existsSync(path.join(pcmDir, "repository.json"))).toBe(true)
  expect(fs.existsSync(path.join(pcmDir, "packages.json"))).toBe(true)

  // Verify repository.json has correct URL format
  const repositoryJson = JSON.parse(
    await readFile(path.join(pcmDir, "repository.json"), "utf-8"),
  )
  expect(repositoryJson.packages.url).toContain(
    "testuser--my-resistor.tscircuit.app/pcm/packages.json",
  )

  // Verify ZIP exists in pcm folder and check its contents
  const files = await readdir(pcmDir)
  const zipFile = files.find((f) => f.endsWith(".zip"))
  expect(zipFile).toBeDefined()

  const zipBuffer = await readFile(path.join(pcmDir, zipFile!))
  const zip = await JSZip.loadAsync(zipBuffer)
  const zipPaths = Object.keys(zip.files).sort()
  expect(zipPaths).toMatchInlineSnapshot(`
    [
      "footprints/",
      "footprints/tscircuit_builtin.pretty/",
      "footprints/tscircuit_builtin.pretty/resistor_0402.kicad_mod",
      "metadata.json",
      "symbols/",
      "symbols/tscircuit_builtin.kicad_sym",
    ]
  `)
}, 120_000)
