import { expect, test } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { getPackageManager } from "lib/shared/get-package-manager"

test("init a project with an npm import and build", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const projectDirName = "my-project"
  const projectDir = join(tmpDir, projectDirName)

  await runCommand(`tsci init ${projectDirName} --yes`)

  // Add a dependency to package.json and install it
  const pm = getPackageManager()
  pm.installDeps({ deps: ["is-odd"], cwd: projectDir, dev: true })

  // Modify index.tsx to use the dependency
  const indexTsxPath = join(projectDir, "index.tsx")
  await Bun.write(
    indexTsxPath,
    `
    import isOdd from "is-odd"

    export default () => (
      <board width="10mm" height="10mm">
        {/* We can't really use is-odd in a meaningful way here for the circuit
            but importing it is enough to test if module resolution works. */}
        <resistor resistance={isOdd(3) ? "1k" : "2k"} footprint="0402" name="R1" />
      </board>
    )
    `,
  )

  // Run the build command
  const buildCommand = `tsci build ${indexTsxPath}`
  const { stdout, stderr } = await runCommand(buildCommand)

  // Check that the build was successful
  expect(stderr).toBe("")
  expect(stdout).toContain("Circuit JSON written to")

  // Check the output file for correctness
  const circuitJsonPath = join(projectDir, "dist", "index", "circuit.json")
  const circuitJson = JSON.parse(await Bun.file(circuitJsonPath).text())

  const resistor = circuitJson.find(
    (c: any) => c.type === "source_component" && c.name === "R1",
  )
  expect(resistor).toBeDefined()
  expect(resistor!.resistance).toBe(1000)
}, 20_000)
