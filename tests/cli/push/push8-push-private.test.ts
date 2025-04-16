import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import path, { dirname, join } from "node:path"

test.todo(
  "push command with --private flag creates private package",
  async () => {
    const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
      loggedIn: true,
    })

    // First run init to set up the project properly
    await runCommand("tsci init")

    const packageUnscopedName = path.basename(tmpDir)

    // Modify the generated index.tsx with a simple circuit
    await Bun.write(
      join(tmpDir, "index.tsx"),
      `
    export const Circuit = () => (
      <board width="10mm" height="10mm">
        <resistor name="R1" resistance="10k" footprint="0402" />
      </board>
    )
    `,
    )

    // Run push command with --private flag
    const { stdout: pushStdout, stderr: pushStderr } = await runCommand(
      "tsci push --private",
    )

    // Verify the push was successful
    expect(pushStdout).toContain("published!")

    // Check the registry database to verify the package was created as private
    const packageInfo = registryDb.packages.find(
      (p) => p.name === `test-user/${packageUnscopedName}`,
    )
    expect(packageInfo).toBeDefined()
    expect(packageInfo?.is_private).toBe(true)
  },
)
