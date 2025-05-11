import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

test("remove command handles non-existent package gracefully", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", dependencies: {} }),
  )
  const { stdout } = await runCommand("tsci remove @tsci/not-present")
  expect(stdout).toContain("@tsci/not-present is not a dependency.")
}) 