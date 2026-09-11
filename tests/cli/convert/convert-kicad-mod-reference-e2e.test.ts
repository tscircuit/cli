import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const kicadMod = `(footprint "TwoPad"
 (version 20240108)
 (generator "pcbnew")
 (layer "F.Cu")
 (attr smd)
 (fp_text reference "REF**" (at 0 -2) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
 (pad "1" smd rect (at -0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
 (pad "2" smd rect (at 0.8 0) (size 0.9 1) (layers "F.Cu" "F.Paste" "F.Mask"))
)
`

test("e2e: converted footprint prints instance reference designators", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const modPath = path.join(tmpDir, "two-pad.kicad_mod")
  await writeFile(modPath, kicadMod)
  await runCommand(`tsci convert ${modPath} --name TwoPad`)
  await writeFile(
    path.join(tmpDir, "board.tsx"),
    `import { TwoPad } from "./TwoPad"
export default () => (
  <board width="12mm" height="8mm">
    <TwoPad name="U1" pcbX={-3} schX={-2} />
    <TwoPad name="U2" pcbX={3} schX={2} />
  </board>
)
`,
  )
  const { exitCode } = await runCommand(`tsci build board.tsx`)
  expect(exitCode).toBe(0)
  const circuitJson = JSON.parse(
    await readFile(path.join(tmpDir, "dist", "board", "circuit.json"), "utf-8"),
  )
  const texts = circuitJson
    .filter((e: any) => e.type === "pcb_silkscreen_text")
    .map((e: any) => e.text)
    .sort()
  expect(texts).toEqual(["U1", "U2"])
}, 30000)
