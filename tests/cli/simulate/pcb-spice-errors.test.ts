import { expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import {
  getPcbSpiceFixture,
  pcbSpiceBoard,
  pcbSpiceDeclarations,
  runPcbSpiceCli,
} from "tests/fixtures/pcb-spice"

test("pcb_spice solver and entry errors fail the CLI without opening a report", async () => {
  const cwd = await getPcbSpiceFixture()
  const result = await runPcbSpiceCli({
    cwd,
    args: ["entry.tsx", "--output", "failed", "--open"],
    fail: true,
  })
  expect(result.exitCode).not.toBe(0)
  expect(result.stderr).toContain("Native solver failed")
  expect(await Bun.file(join(cwd, "opened.json")).exists()).toBe(false)
  expect(await Bun.file(join(cwd, "failed", "results.html")).exists()).toBe(
    false,
  )

  await rm(join(cwd, "tools.json"))
  const missingTools = await runPcbSpiceCli({ cwd, mockPipeline: false })
  expect(missingTools.exitCode).not.toBe(0)
  expect(missingTools.stderr).toContain("pcb-spice-pipeline --setup")

  const missingModelingCwd =
    await getPcbSpiceFixture(`import { analog } from "@tscircuit/core"
export default () => ${pcbSpiceBoard.replace("</board>", `${pcbSpiceDeclarations}</board>`)}`)
  const missingModeling = await runPcbSpiceCli({
    cwd: missingModelingCwd,
    mockPipeline: false,
  })
  expect(missingModeling.exitCode).not.toBe(0)
  expect(missingModeling.stderr).toContain("Export modeling")
}, 30000)
