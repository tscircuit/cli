import { test, expect } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("import respects allowedSources: jlcpcb-only policy blocks --tscircuit flag", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ allowedSources: ["jlcpcb"] }),
  )

  const { stderr, exitCode } = await runCommand("tsci import --tscircuit 555")

  expect(exitCode).toBe(1)
  expect(stderr).toMatchInlineSnapshot(`
    "Import from the tscircuit registry is not allowed by this project's policy.
    Allowed sources: jlcpcb
    To change this, update "allowedSources" in tscircuit.config.json.
    "
  `)
})

test("import respects allowedSources: tscircuit-only policy blocks --jlcpcb flag", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ allowedSources: ["tscircuit"] }),
  )

  const { stderr, exitCode } = await runCommand("tsci import --jlcpcb 555")

  expect(exitCode).toBe(1)
  expect(stderr).toMatchInlineSnapshot(`
    "Import from JLCPCB is not allowed by this project's policy.
    Allowed sources: tscircuit
    To change this, update "allowedSources" in tscircuit.config.json.
    "
  `)
})

test("import with no config has no source restrictions", async () => {
  const { runCommand } = await getCliTestFixture()

  const { stderr } = await runCommand("tsci import --tscircuit 555")

  expect(stderr).not.toContain("not allowed by this project's policy")
})

test("import with allowedSources both sources has no restrictions", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ allowedSources: ["jlcpcb", "tscircuit"] }),
  )

  const { stderr } = await runCommand("tsci import --tscircuit 555")

  expect(stderr).not.toContain("not allowed by this project's policy")
})
