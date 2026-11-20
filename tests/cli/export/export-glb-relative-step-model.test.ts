import { expect, test } from "bun:test"
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { renderGLTFToPNGFromGLB } from "poppygl"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// cli#5654: `tsci build --glbs` loads a cadModel with a relative stepUrl, but
// `tsci export -f glb` passes the relative path straight to the GLB converter,
// which cannot fetch it, so the part renders as a placeholder box.
const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <capacitor
      name="C1"
      capacitance="100nF"
      footprint="0402"
      cadModel={{ stepUrl: "./libraries/model.step" }}
    />
  </board>
)`

/** Fixed camera above the 10 mm board, looking at its center. */
const GLB_SNAPSHOT_CAMERA = {
  camPos: [9, 15, -10] as [number, number, number],
  lookAt: [0, 0, 0] as [number, number, number],
  fov: 50,
  width: 480,
  height: 320,
}

test(
  "export glb loads a cadModel with a relative stepUrl",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await mkdir(path.join(tmpDir, "libraries"))
    await copyFile(
      path.join(import.meta.dir, "../assets/SW_Push_1P1T_NO_CK_KMR2.step"),
      path.join(tmpDir, "libraries/model.step"),
    )
    await writeFile(path.join(tmpDir, "index.tsx"), circuitCode)

    const { stderr } = await runCommand(
      "tsci export index.tsx -f glb -o export.glb",
    )

    expect(
      [...stderr.matchAll(/Failed to load STEP from [^:]+/g)].map(
        ([message]) => message,
      ),
    ).toMatchInlineSnapshot(`[]`)
    const glb = await readFile(path.join(tmpDir, "export.glb"))
    await expect(
      renderGLTFToPNGFromGLB(glb, GLB_SNAPSHOT_CAMERA),
    ).toMatchPngSnapshot(import.meta.path)
  },
  { timeout: 60000 },
)
