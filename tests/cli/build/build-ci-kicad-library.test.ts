import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readdir, stat, mkdir } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"

test("build --ci with build.kicadLibrary config generates KiCad library", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create lib directory with a component
  await mkdir(path.join(tmpDir, "lib"), { recursive: true })

  const componentCode = `
export const MyResistor = () => (
  <resistor resistance="1k" footprint="0402" name="R1" />
)
`

  await writeFile(path.join(tmpDir, "lib", "index.tsx"), componentCode)

  // Create tscircuit.config.json with build.kicadLibrary enabled
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "./lib/index.tsx",
      build: {
        kicadLibrary: true,
      },
    }),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-kicad-library",
      version: "1.0.0",
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await runCommand("tsci install")

  const { stdout, stderr } = await runCommand("tsci build --ci")

  expect(stdout).toContain("Generating KiCad library")
  expect(stdout).toContain("kicad-library")

  // Check that the kicad-library directory was created
  const kicadLibDir = path.join(tmpDir, "dist", "kicad-library")
  expect(fs.existsSync(kicadLibDir)).toBe(true)

  // Check for expected KiCad library files
  const files = await readdir(kicadLibDir, { recursive: true })
  const fileList = files.map((f) => f.toString())

  // Should have symbols and footprints directories
  expect(fileList.some((f) => f.includes("symbols"))).toBe(true)
  expect(fileList.some((f) => f.includes("footprints"))).toBe(true)
}, 120_000)
