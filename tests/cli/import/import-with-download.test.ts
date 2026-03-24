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

  const componentDir = path.join(tmpDir, "imports", "RP2040")
  expect(fs.readdirSync(componentDir).sort()).toMatchInlineSnapshot(`
    [
      "RP2040.obj",
      "RP2040.step",
      "RP2040.tsx",
    ]
  `)

  const fileContent = fs.readFileSync(
    path.join(componentDir, "RP2040.tsx"),
    "utf8",
  )

  expect(fileContent).not.toContain("https://")
  expect(fileContent).toContain('import stepPath from "./RP2040.step"')
  expect(fileContent).toContain('import objPath from "./RP2040.obj"')
  expect(fileContent).toContain("stepUrl: stepPath")
  expect(fileContent).toContain("objUrl: objPath")
}, 60_000)
