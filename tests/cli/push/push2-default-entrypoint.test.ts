import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should use default entrypoint if no file is provided", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  const defaultEntrypoint = path.resolve(tmpDir, "index.tsx")
  fs.writeFileSync(defaultEntrypoint, "// Default entrypoint!")
  const { stdout, stderr } = await runCommand(`tsci push`)
  expect({ stdout, stderr }).toMatchInlineSnapshot(`
    {
      "stderr": 
    "No package.json found, try running 'tsci init' to bootstrap the project
    "
    ,
      "stdout": 
    "Detected entrypoint: 'index.tsx'
    "
    ,
    }
  `)
})
