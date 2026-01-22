import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { mkdir, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

const listDirectoryTree = async (rootDir: string) => {
  const entries: string[] = ["dist/"]

  const walk = async (currentDir: string, relativeDir: string) => {
    const dirEntries = await readdir(currentDir, { withFileTypes: true })
    dirEntries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of dirEntries) {
      const relativePath = path
        .join(relativeDir, entry.name)
        .split(path.sep)
        .join("/")
      if (entry.isDirectory()) {
        entries.push(`${relativePath}/`)
        await walk(path.join(currentDir, entry.name), relativePath)
      } else {
        entries.push(relativePath)
      }
    }
  }

  await walk(rootDir, "dist")
  return entries.join("\n")
}

test("build --ci with kicadLibrary + kicadPcm shows directory structure", async () => {
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
      kicadLibraryName: "example-kicad-lib",
      build: {
        kicadLibrary: true,
        kicadPcm: true,
      },
    }),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-kicad-structure",
      version: "1.0.0",
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await runCommand("tsci install")
  await runCommand("tsci build --ci")

  const distTree = await listDirectoryTree(path.join(tmpDir, "dist"))

  expect(distTree).toMatchInlineSnapshot(`
"dist/
dist/3d.png
dist/index.cjs
dist/index.d.ts
dist/index.html
dist/index.js
dist/kicad-library/
dist/kicad-library/footprints/
dist/kicad-library/footprints/tscircuit_builtin.pretty/
dist/kicad-library/footprints/tscircuit_builtin.pretty/resistor_0402.kicad_mod
dist/kicad-library/fp-lib-table
dist/kicad-library/sym-lib-table
dist/kicad-library/symbols/
dist/kicad-library/symbols/tscircuit_builtin.kicad_sym
dist/lib/
dist/lib/index/
dist/lib/index/circuit.json
dist/pcb.svg
dist/pcm/
dist/pcm/com.tscircuit.tscircuit.test-kicad-structure-1.0.0.zip
dist/pcm/packages.json
dist/pcm/repository.json
dist/schematic.svg"
`)
}, 120_000)
