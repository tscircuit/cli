import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should bump version if release already exists", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")
  const packageJsonPath = path.resolve(tmpDir, "package.json")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify({ name: "test-package", version: "1.0.0" }),
  )

  const { stdout: stdout1, stderr: stderr1 } = await runCommand(
    `tsci push ${snippetFilePath}`,
  )

  expect({ stdout: stdout1, stderr: stderr1 }).toMatchInlineSnapshot(`
    {
      "stderr": "",
      "stdout": 
    "Package created
    ⬆︎ package.json
    ⬆︎ snippet.tsx


    Upload Summary
      Succeeded: 2 files


    "@tsci/test-user.test-package@1.0.0" published!
    https://tscircuit.com/test-user/test-package
    "
    ,
    }
  `)

  const { stdout: stdout2, stderr: stderr2 } = await runCommand(
    `tsci push ${snippetFilePath}`,
  )

  expect({ stdout: stdout2, stderr: stderr2 }).toMatchInlineSnapshot(`
    {
      "stderr": "",
      "stdout": 
    "Incrementing Package Version 1.0.0 -> 1.0.1
    ⬆︎ package.json
    ⬆︎ snippet.tsx


    Upload Summary
      Succeeded: 2 files


    "@tsci/test-user.test-package@1.0.1" published!
    https://tscircuit.com/test-user/test-package
    "
    ,
    }
  `)
}, 30_000)
