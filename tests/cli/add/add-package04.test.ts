import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

test("tsci add - handles author/component format as tscircuit package", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create initial package.json
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {},
    }),
  )

  // Test author/component format (should convert to @tsci/author.component)
  const result = await runCommand("tsci add seveibar/soup")

  // Should show it's trying to add @tsci/seveibar.soup
  expect(
    result.stdout.includes("@tsci/seveibar.soup") ||
      result.stderr.includes("@tsci/seveibar.soup"),
  ).toBe(true)
})
