import { expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { getPcbSpiceFixture, runPcbSpiceCli } from "tests/fixtures/pcb-spice"

test("ngspice Circuit JSON rejects pcb_spice report flags", async () => {
  const cwd = await getPcbSpiceFixture()
  await writeFile(join(cwd, "empty.json"), "[]")
  const result = await runPcbSpiceCli({ cwd, args: ["empty.json", "--open"] })
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain(
    '--open and --output require spiceEngine="pcb_spice"',
  )
  expect(await Bun.file(join(cwd, "opened.json")).exists()).toBe(false)
}, 30000)
