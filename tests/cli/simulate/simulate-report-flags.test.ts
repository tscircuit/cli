import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { getPcbSpiceFixture, runPcbSpiceCli } from "tests/fixtures/pcb-spice"

test("ngspice Circuit JSON rejects the pcb_spice output flag", async () => {
  const cwd = await getPcbSpiceFixture()
  await writeFile(join(cwd, "empty.json"), "[]")
  const result = await runPcbSpiceCli({
    cwd,
    args: ["empty.json", "--output", "report"],
  })
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain('--output requires spiceEngine="pcb_spice"')
}, 30000)
