import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should create package if it does not exist", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })

  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-package",
      version: "1.0.0",
      license: "CC-BY-ND-4.0",
    }),
  )

  const { stdout } = await runCommand(`tsci push ${snippetFilePath}`)
  expect(stdout).toContain("published!")

  const publishedPackage = registryDb.packages.find(
    (pkg) => pkg.name === "test-user/test-package",
  )
  const release = registryDb.packageReleases.find(
    (release) =>
      release.package_id === publishedPackage?.package_id &&
      release.version === "1.0.0",
  )
  expect(release?.license).toBe("CC-BY-ND-4.0")
})
