import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("snapshot accepts nonvisual SVG ID changes with and without diff artifacts", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "ids.board.tsx"),
    'export default () => <board width="10mm" height="10mm"><chip name="U1" footprint="soic8" /></board>',
  )
  expect((await runCommand("tsci snapshot --update")).exitCode).toBe(0)
  const path = join(tmpDir, "__snapshots__", "ids.board-pcb.snap.svg")
  const original = await Bun.file(path).text()
  const changed = original.replace(/pcb_component_\d+/g, "pcb_component_999")
  expect(changed).not.toBe(original)
  await Bun.write(path, changed)

  for (const flags of ["", "--ci", "--test"]) {
    const result = await runCommand(`tsci snapshot ${flags}`)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("All snapshots match")
    expect(
      await Bun.file(path.replace(".snap.svg", ".diff.svg")).exists(),
    ).toBe(false)
  }
  expect(await Bun.file(path).text()).toBe(changed)
}, 60_000)
