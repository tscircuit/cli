import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { join } from "node:path"

test.skip("release command increments version and pushes to registry", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create test files using Bun
  await Bun.write(
    join(tmpDir, "package.json"),
    JSON.stringify({
      name: "@tsci/test-package",
      version: "0.1.0",
    }),
  )

  await Bun.write(
    join(tmpDir, "circuit.tsx"),
    `
    export const Circuit = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
  `,
  )

  // Run release command
  const { stdout } = await runCommand("tsci release --patch")
  expect(stdout).toContain("Released version 0.1.1")

  // Verify package.json was updated
  const pkgJson = JSON.parse(
    await Bun.file(join(tmpDir, "package.json")).text(),
  )
  expect(pkgJson.version).toBe("0.1.1")
})
