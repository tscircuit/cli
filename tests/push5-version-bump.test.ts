import { test, expect } from "bun:test"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
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
      "stderr": 
    "Package author does not match the logged in GitHub username
    "
    ,
      "stdout": 
    "Package created


    Uploaded file package.json to the registry.
    Uploaded file snippet.tsx to the registry.
    Successfully pushed package "@tsci/test-user.test-package@1.0.0"! https://tscircuit.com/test-user/test-package
    "
    ,
    }
  `)

  const { stdout: stdout2, stderr: stderr2 } = await runCommand(
    `tsci push ${snippetFilePath}`,
  )

  expect({ stdout: stdout2, stderr: stderr2 }).toMatchInlineSnapshot(`
    {
      "stderr": 
    "Package author does not match the logged in GitHub username
    "
    ,
      "stdout": 
    "Incrementing Package Version 1.0.0 -> 1.0.1


    Uploaded file package.json to the registry.
    Uploaded file snippet.tsx to the registry.
    Successfully pushed package "@tsci/test-user.test-package@1.0.1"! https://tscircuit.com/test-user/test-package
    "
    ,
    }
  `)
})
