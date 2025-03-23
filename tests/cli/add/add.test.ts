import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"
import * as fs from "node:fs"

test("add command installs package and updates .npmrc", async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture()

  // Create initial package.json using Bun
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Mock the package in the registry database
  registryDb.packages.push({
    name: "@tsci/example-package",
    unscoped_name: "example-package",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: null,
    star_count: 0,
    is_private: null,
    is_public: null,
    is_unlisted: null,
    package_id: "test-package-id",
    license: "MIT",
    creator_account_id: registryDb.accounts[0].account_id,
    owner_org_id: "test-org-id",
    owner_github_username: "test-user",
    is_snippet: false,
    is_board: false,
    is_package: true,
    is_model: false,
    is_footprint: false,
    is_source_from_github: false,
    latest_package_release_id: "test-release-id",
    latest_version: "1.0.0",
    ai_description: null,
    snippet_type: "board",
  })

  // Run add command
  const { stdout } = await runCommand("tsci add @tsci/example-package")
  expect(stdout).toContain("Added @tsci/example-package")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.dependencies["@tsci/example-package"]).toBeDefined()

  // Verify .npmrc was created/updated
  const npmrc = await Bun.file(join(tmpDir, ".npmrc")).text()
  expect(npmrc).toContain("@tsci:registry=https://npm.tscircuit.com")
})
