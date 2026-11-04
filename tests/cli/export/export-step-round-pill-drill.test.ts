import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { parseRepository } from "stepts"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const platedHoles = [
  {
    name: "pill pad with a round drill",
    props:
      'shape="pill" outerWidth={1.7} outerHeight={1.95} holeWidth={0.95} holeHeight={0.95}',
  },
  {
    name: "pill pad with a slotted drill",
    props:
      'shape="pill" outerWidth={1.7} outerHeight={1.95} holeWidth={0.95} holeHeight={1.2}',
  },
  {
    name: "circular pad with a round drill",
    props: 'shape="circle" outerDiameter={1.7} holeDiameter={0.95}',
  },
]

test.each(platedHoles)(
  "STEP export produces valid numeric directions for $name",
  async ({ props }) => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "plated-hole.tsx")
    await writeFile(
      circuitPath,
      `export default () => (
        <board width="10mm" height="10mm">
          <chip name="J1" footprint={
            <footprint>
              <platedhole pcbX={0} pcbY={0} ${props} />
            </footprint>
          } />
        </board>
      )`,
    )

    const { exitCode, stderr } = await runCommand(
      `tsci export ${circuitPath} --format step`,
    )
    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    const step = await readFile(path.join(tmpDir, "plated-hole.step"), "utf8")
    expect(step).not.toMatch(/\b(?:NaN|Infinity)\b/)
    expect(step).toContain("MANIFOLD_SOLID_BREP('PCB'")
    expect(step.trimEnd()).toEndWith("END-ISO-10303-21;")
    expect(() => parseRepository(step)).not.toThrow()
  },
  30_000,
)
