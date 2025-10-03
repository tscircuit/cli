import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should create package under org", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  const circuitFilePath = path.resolve(tmpDir, "index.circuit.tsx")

  fs.writeFileSync(
    circuitFilePath,
    `export default () => (
        <board>
            <resistor name="R1" resistance="1k" footprint="0402" />
        </board>
    )`,
  )
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-organization/example-dir3",
      version: "0.0.1",
      dependencies: {
        "@tscircuit/core": "latest",
        react: "^19.1.1",
      },
    }),
  )

  const { stdout } = await runCommand(`tsci push`)
  expect(stdout).toContain("published!")
})
