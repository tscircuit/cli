import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
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
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const { stdout, stderr } = await runCommand(`tsci push ${snippetFilePath}`)

  expect({ stdout, stderr }).toMatchObject({
    stdout:
      'Package created\n\n\n⬆︎ package.json\n⬆︎ snippet.tsx\n\n\nUpload Summary\n  Succeeded: 2 files\n\n"@tsci/test-user.test-package@1.0.0" published!\nhttps://tscircuit.com/test-user/test-package\n',
    stderr: "",
  })
}, 30_000)
