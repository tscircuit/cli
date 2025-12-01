import { expect, test } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("init --no-install creates project without installing dependencies", async () => {
  const { runCommand } = await getCliTestFixture()

  const projectDir = "test-project"
  const { stdout } = await runCommand(`tsci init ${projectDir} -y --no-install`)
  expect(stdout).not.toContain("Installing dependencies")
})

test("init --no-install creates project installing dependencies", async () => {
  const { runCommand } = await getCliTestFixture()

  const projectDir = "test-project"
  const { stdout } = await runCommand(`tsci init ${projectDir} -y`)
  expect(stdout).toContain("Installing dependencies")
})
