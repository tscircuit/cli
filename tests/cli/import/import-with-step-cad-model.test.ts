import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import path from "node:path"
import fs from "node:fs"

test("import command generates package from JLCPCB part", async () => {
  if (process.env.CI) {
    return
  }

  const { tmpDir, runCommand } = await getCliTestFixture({ loggedIn: true })
  const { stdout, stderr } = await runCommand(
    "tsci import C2040 --model-format step",
  )
  const filePath = path.join(tmpDir, "imports", "RP2040.tsx")
  expect(fs.existsSync(filePath)).toBe(true)
  const fileContent = fs.readFileSync(filePath, "utf8")
  expect(fileContent).toContain("stepUrl")
  expect(stderr).toBe("")
  expect(stdout.toLowerCase()).toContain("imported")
}, 20_000)
