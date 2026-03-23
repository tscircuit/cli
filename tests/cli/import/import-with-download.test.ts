import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import path from "node:path"
import fs from "node:fs"

test("import --download downloads step and obj files locally and updates TSX paths", async () => {
  if (process.env.CI) {
    return
  }

  const { tmpDir, runCommand } = await getCliTestFixture({ loggedIn: true })
  await runCommand("tsci import --jlcpcb --download C2040")

  const importsDir = path.join(tmpDir, "imports")
  expect(fs.readdirSync(importsDir).sort()).toMatchInlineSnapshot(`
    [
      "RP2040.obj",
      "RP2040.step",
      "RP2040.tsx",
    ]
  `)

  const fileContent = fs.readFileSync(
    path.join(importsDir, "RP2040.tsx"),
    "utf8",
  )

  expect(fileContent).not.toContain("https://")
  expect(fileContent).toContain("./RP2040.step")
  expect(fileContent).toContain("./RP2040.obj")
}, 60_000)
