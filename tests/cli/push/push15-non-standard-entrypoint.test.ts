import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should use board file as entrypoint when no standard entrypoint found (issue #2797)", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  // Create a board file with non-standard name (not index.tsx / index.circuit.tsx etc.)
  const boardFilePath = path.resolve(tmpDir, "my-sensor.board.tsx")
  fs.writeFileSync(boardFilePath, "// Board content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "testuser/my-sensor", version: "1.0.0" }),
  )

  const { stdout, stderr, exitCode } = await runCommand("tsci push")
  // Should detect the .board.tsx file and succeed
  expect(exitCode).toBe(0)
  expect(stdout + stderr).toContain("published!")
})
