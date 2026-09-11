import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

// https://github.com/tscircuit/cli/issues/4708
const kicadMod = `(footprint "TwoPad"
 (version 20240108)
 (generator "pcbnew")
 (layer "F.Cu")
 (attr smd)
 (fp_text reference "REF**" (at 0 -2) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
 (fp_text user "KEEPME" (at 0 2) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
 (pad "1" smd rect (at -0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
 (pad "2" smd rect (at 0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
)
`

test("convert binds the KiCad reference placeholder to the instance name", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const modPath = path.join(tmpDir, "two-pad.kicad_mod")
  await writeFile(modPath, kicadMod)

  const { stderr, exitCode } = await runCommand(`tsci convert ${modPath}`)
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")

  const tsx = await readFile(path.join(tmpDir, "two-pad.tsx"), "utf-8")
  // The reference placeholder becomes instance-aware...
  expect(tsx).toContain('text={props.name ?? "REF**"}')
  // ...while ordinary user text stays literal
  expect(tsx).toContain('text="KEEPME"')
})
