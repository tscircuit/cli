import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("should fail if no entrypoint file is found", async () => {
  const { runCommand } = await getCliTestFixture()
  try {
    await runCommand("tsci push")
  } catch (e) {
    if (e instanceof Error) {
      expect(e.message).toContain(
        "No entrypoint found. Run 'tsci init' to bootstrap a basic project.",
      )
    } else {
      throw e
    }
  }
})
