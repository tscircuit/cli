import { test, expect } from "bun:test"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should upload files to the registry", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "test-package", version: "1.0.0" }),
  )

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)
  expect({ stdout, stderr }).toMatchInlineSnapshot(`
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
})
