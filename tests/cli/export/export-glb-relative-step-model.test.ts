import { expect, test } from "bun:test"
import { copyFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// cli#5654: `tsci build --glbs` loads a cadModel with a relative stepUrl, but
// `tsci export -f glb` passes the relative path straight to the GLB converter,
// which cannot fetch it.
const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <capacitor
      name="C1"
      capacitance="100nF"
      footprint="0402"
      cadModel={{ stepUrl: "./libraries/cap.step" }}
    />
  </board>
)`

test(
  "export glb loads a cadModel with a relative stepUrl",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await mkdir(path.join(tmpDir, "libraries"))
    await copyFile(
      path.join(import.meta.dir, "../assets/SW_Push_1P1T_NO_CK_KMR2.step"),
      path.join(tmpDir, "libraries/cap.step"),
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
  },
  { timeout: 60000 },
)
