import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readdir, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"
import JSZip from "jszip"

async function getDirectoryStructure(
  dir: string,
  baseDir?: string,
): Promise<string[]> {
  const base = baseDir ?? dir
  const entries = await readdir(dir, { withFileTypes: true })
  const paths: string[] = []

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(base, fullPath)

    if (entry.isDirectory()) {
      paths.push(relativePath + "/")
      paths.push(...(await getDirectoryStructure(fullPath, base)))
    } else {
      // Replace version-specific zip filename with placeholder
      const displayPath = relativePath.replace(
        /_\d+\.\d+\.\d+\.zip$/,
        "_VERSION.zip",
      )
      paths.push(displayPath)
    }
  }

  return paths
}

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

  // Check dist directory structure
  const distDir = path.join(tmpDir, "dist")
  const distStructure = await getDirectoryStructure(distDir)
  expect(distStructure).toMatchInlineSnapshot(`
    [
      "kicad-library-pcm/",
      "kicad-library-pcm/footprints/",
      "kicad-library-pcm/footprints/tscircuit_builtin.pretty/",
      "kicad-library-pcm/footprints/tscircuit_builtin.pretty/resistor_0402.kicad_mod",
      "kicad-library-pcm/fp-lib-table",
      "kicad-library-pcm/sym-lib-table",
      "kicad-library-pcm/symbols/",
      "kicad-library-pcm/symbols/tscircuit_builtin.kicad_sym",
      "lib/",
      "lib/index/",
      "lib/index/circuit.json",
      "pcm/",
      "pcm/com.tscircuit.testuser.my-resistor-1.0.0.zip",
      "pcm/packages.json",
      "pcm/repository.json",
    ]
  `)

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
