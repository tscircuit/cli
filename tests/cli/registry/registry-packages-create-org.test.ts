import { expect, test } from "bun:test"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("registry package creation with --org", async () => {
  const { runCommand, registryDb } = await getCliTestFixture({ loggedIn: true })

  const { exitCode, stderr } = await runCommand(
    "tsci registry packages create --package-name demo-package --org test-user --public",
  )

  expect(exitCode).toBe(1)
  expect(stderr).toContain("@tsci/test-user.demo-package")
  expect(
    registryDb.packages.find((pkg) => pkg.name === "test-user/demo-package"),
  ).toBeUndefined()
})
