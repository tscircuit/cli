import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const kicadMod = `
(module R_0402_1005Metric (layer F.Cu) (tedit 5F68FEEE)
  (descr "Resistor SMD 0402 (1005 Metric), square (rectangular) end terminal, IPC_7351 nominal, (Body size source: IPC-SM-782 page 72, https://www.pcb-3d.com/wordpress/wp-content/uploads/ipc-sm-782a_amendment_1_and_2.pdf), generated with kicad-footprint-generator")
  (tags resistor)
  (attr smd)
  (fp_text reference REF** (at 0 -1.17) (layer F.SilkS)
    (effects (font (size 1 1) (thickness 0.15)))
  )
  (fp_text value R_0402_1005Metric (at 0 1.17) (layer F.Fab)
    (effects (font (size 1 1) (thickness 0.15)))
  )
  (fp_line (start -0.525 0.27) (end -0.525 -0.27) (layer F.Fab) (width 0.1))
  (fp_line (start -0.525 -0.27) (end 0.525 -0.27) (layer F.Fab) (width 0.1))
  (fp_line (start 0.525 -0.27) (end 0.525 0.27) (layer F.Fab) (width 0.1))
  (fp_line (start 0.525 0.27) (end -0.525 0.27) (layer F.Fab) (width 0.1))
  (fp_line (start -0.153641 -0.38) (end 0.153641 -0.38) (layer F.SilkS) (width 0.12))
  (fp_line (start -0.153641 0.38) (end 0.153641 0.38) (layer F.SilkS) (width 0.12))
  (fp_line (start -0.93 0.47) (end -0.93 -0.47) (layer F.CrtYd) (width 0.05))
  (fp_line (start -0.93 -0.47) (end 0.93 -0.47) (layer F.CrtYd) (width 0.05))
  (fp_line (start 0.93 -0.47) (end 0.93 0.47) (layer F.CrtYd) (width 0.05))
  (fp_line (start 0.93 0.47) (end -0.93 0.47) (layer F.CrtYd) (width 0.05))
  (pad 1 smd roundrect (at -0.51 0) (size 0.54 0.64) (layers F.Cu F.Mask F.Paste) (roundrect_rratio 0.25))
  (pad 2 smd roundrect (at 0.51 0) (size 0.54 0.64) (layers F.Cu F.Mask F.Paste) (roundrect_rratio 0.25))
  (fp_text user %R (at 0 0) (layer F.Fab)
    (effects (font (size 0.26 0.26) (thickness 0.04)))
  )
  (model \${KISYS3DMOD}/Resistor_SMD.3dshapes/R_0402_1005Metric.wrl
    (at (xyz 0 0 0))
    (scale (xyz 1 1 1))
    (rotate (xyz 0 0 0))
  )
)
`

test("convert kicad_mod to tsx", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const modPath = path.join(tmpDir, "R_0402_1005Metric.kicad_mod")
  await writeFile(modPath, kicadMod)

  const { stdout, stderr } = await runCommand(`tsci convert ${modPath}`)
  expect(stderr).toBe("")
  expect(stdout).toContain("Converted")

  const tsxPath = path.join(tmpDir, "R_0402_1005Metric.tsx")
  const tsx = await readFile(tsxPath, "utf-8")
  expect(tsx).toContain("export const R_0402_1005Metric")
})
