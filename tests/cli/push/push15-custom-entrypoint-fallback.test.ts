import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"

test("should push a package using fallback entrypoint discovery when no index.circuit.tsx or mainEntrypoint exists (Issue #2797)", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    loggedIn: true,
  })

  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )
  fs.writeFileSync(
    path.resolve(tmpDir, "my-custom-circuit.tsx"),
    'export default () => <board width="10mm" height="10mm" />',
  )

  const { stdout, stderr, exitCode } = await runCommand("tsci push")

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("⬆︎ package.json")
  expect(stdout).toContain("⬆︎ my-custom-circuit.tsx")
  expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
}, 30_000)
