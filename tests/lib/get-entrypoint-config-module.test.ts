import { expect, test } from "bun:test"
import * as fs from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"
import { getEntrypoint } from "../../lib/shared/get-entrypoint"

test("getEntrypoint detects entrypoint from tscircuit.config.ts", async () => {
  const { tmpDir } = await getCliTestFixture()

  await fs.mkdir(path.join(tmpDir, "src"), { recursive: true })
  await fs.writeFile(
    path.join(tmpDir, "src", "main.circuit.tsx"),
    'export default () => <board width="10mm" height="10mm"></board>',
  )
  await fs.writeFile(
    path.join(tmpDir, "tscircuit.config.ts"),
    [
      "export default {",
      '  mainEntrypoint: "src/main.circuit.tsx",',
      "}",
      "",
    ].join("\n"),
  )

  const entrypoint = await getEntrypoint({
    projectDir: tmpDir,
  })

  expect(entrypoint).toBe(path.join(tmpDir, "src", "main.circuit.tsx"))
})
