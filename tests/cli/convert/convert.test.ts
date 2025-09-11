import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import fs from "node:fs"
import path from "node:path"

test("convert command converts KiCad mod to tscircuit TSX", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture({ loggedIn: true })

  // Create a test KiCad mod file
  const kicadModContent = `(footprint "R_0805_2012Metric" (version 20211014) (generator pcbnew)
  (layer "F.Cu")
  (tedit 5F68FEEE)
  (descr "Resistor SMD 0805 (2012 Metric), square (rectangular) end terminal")
  (tags "resistor")
  (attr smd)
  (fp_text reference "REF**" (at 0 -1.65) (layer "F.SilkS")
    (effects (font (size 1 1) (thickness 0.15)))
  )
  (fp_text value "R_0805_2012Metric" (at 0 1.65) (layer "F.Fab")
    (effects (font (size 1 1) (thickness 0.15)))
  )
  (pad "1" smd roundrect (at -0.9125 0) (size 1.025 1.4) (layers "F.Cu" "F.Paste" "F.Mask"))
  (pad "2" smd roundrect (at 0.9125 0) (size 1.025 1.4) (layers "F.Cu" "F.Paste" "F.Mask"))
)`

  const kicadModPath = path.join(tmpDir, "test-resistor.kicad_mod")
  fs.writeFileSync(kicadModPath, kicadModContent)

  const { stdout, stderr } = await runCommand(`tsci convert ${kicadModPath}`)

  expect(stderr).toBe("")
  expect(stdout.toLowerCase()).toContain("successfully converted")

  // Check that the output TSX file was created
  const outputPath = kicadModPath.replace(/\.kicad_mod$/, ".tsx")
  expect(fs.existsSync(outputPath)).toBe(true)

  // Check that the output contains valid tscircuit code
  const outputContent = fs.readFileSync(outputPath, "utf-8")
  expect(outputContent).toContain("import")
  expect(outputContent).toContain("ChipProps")
  expect(outputContent).toContain("<chip")
  expect(outputContent).toContain("<footprint>")
  expect(outputContent).toContain("<smtpad")
  expect(outputContent).toContain('portHints={["1"]}')
  expect(outputContent).toContain('portHints={["2"]}')
}, 20_000)

test("convert command with custom output path", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture({ loggedIn: true })

  const kicadModContent = `(footprint "TestFootprint" (version 20211014)
  (layer "F.Cu")
  (pad "1" smd rect (at 0 0) (size 1 1) (layers "F.Cu"))
)`

  const kicadModPath = path.join(tmpDir, "test.kicad_mod")
  const customOutputPath = path.join(tmpDir, "custom-output.tsx")
  fs.writeFileSync(kicadModPath, kicadModContent)

  const { stdout, stderr } = await runCommand(
    `tsci convert ${kicadModPath} -o ${customOutputPath}`,
  )

  expect(stderr).toBe("")
  expect(stdout.toLowerCase()).toContain("successfully converted")
  expect(stdout).toContain(customOutputPath)

  expect(fs.existsSync(customOutputPath)).toBe(true)
}, 20_000)

test("convert command handles file not found", async () => {
  const { runCommand } = await getCliTestFixture({ loggedIn: true })

  const { stdout, stderr } = await runCommand(
    "tsci convert /nonexistent/file.kicad_mod",
  )

  expect(stderr.toLowerCase()).toContain("file not found")
}, 20_000)

test("convert command handles wrong file extension", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture({ loggedIn: true })

  const wrongFile = path.join(tmpDir, "wrong.txt")
  fs.writeFileSync(wrongFile, "test content")

  const { stdout, stderr } = await runCommand(`tsci convert ${wrongFile}`)

  expect(stderr.toLowerCase()).toContain("must be a .kicad_mod file")
}, 20_000)
